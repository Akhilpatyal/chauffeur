#!/usr/bin/env node
/*
 * Migrates the frontend's hardcoded content into MongoDB.
 *
 * Idempotent: every record is upserted on `legacyId`, so running this twice
 * changes nothing and running it after a content edit in the dashboard will
 * overwrite that edit for the seeded fields. Pass --fresh to drop the content
 * collections first (never the leads).
 *
 *   npm run seed
 *   npm run seed:fresh
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { connectMongo, disconnectMongo, syncIndexes } from '../src/db/mongoose.js';
import { Journey } from '../src/models/Journey.js';
import { Destination } from '../src/models/Destination.js';
import { GroupTour } from '../src/models/GroupTour.js';
import { Hotel } from '../src/models/Hotel.js';
import { Testimonial } from '../src/models/Testimonial.js';
import { TeamMember } from '../src/models/TeamMember.js';
import { Article } from '../src/models/Article.js';
import { FeatureFlag, FLAG_DEFAULTS } from '../src/models/FeatureFlag.js';
import { env } from '../src/config/env.js';
import {
  journeyFrom,
  authoredJourneyFrom,
  destinationFrom,
  mergeGroupTours,
  groupTourFrom,
  hotelFrom,
  testimonialFrom,
  teamMemberFrom,
  articleFrom,
} from '../seed/transform.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fresh = process.argv.includes('--fresh');

/*
 * Upsert on legacyId. bulkWrite issues one round trip per collection instead of
 * one per record, which matters when this runs as a deploy step.
 */
async function upsertAll(Model, documents, label) {
  if (documents.length === 0) {
    console.log(`  ${label}: nothing to seed`);
    return;
  }

  const operations = documents.map((document) => ({
    updateOne: {
      filter: { legacyId: document.legacyId },
      update: {
        $set: document,
        $setOnInsert: { createdAt: new Date() },
      },
      upsert: true,
    },
  }));

  const result = await Model.bulkWrite(operations, { ordered: false });
  console.log(
    `  ${label}: ${result.upsertedCount} created, ${result.modifiedCount} updated, ${documents.length} total`,
  );
}

async function seedFlags() {
  // Only inserts missing flags; an operator's runtime override is never reset.
  const operations = Object.entries(FLAG_DEFAULTS).map(([key, config]) => ({
    updateOne: {
      filter: { key },
      update: {
        $setOnInsert: {
          key,
          value: config.value,
          description: config.description,
          message: config.message,
        },
      },
      upsert: true,
    },
  }));
  const result = await FeatureFlag.bulkWrite(operations, { ordered: false });
  console.log(`  feature flags: ${result.upsertedCount} created`);
}

async function main() {
  const snapshotPath = path.resolve(here, '../seed/data/frontend-snapshot.json');
  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));

  console.log(`seeding ${env.MONGODB_URI.replace(/\/\/[^@]*@/, '//***@')}\n`);
  await connectMongo();

  if (fresh) {
    console.log('  --fresh: clearing content collections (leads are never touched)');
    await Promise.all(
      [Journey, Destination, GroupTour, Hotel, Testimonial, TeamMember, Article].map((Model) =>
        Model.deleteMany({}),
      ),
    );
  }

  const journeys = (snapshot.journeys ?? []).map(journeyFrom);
  if (snapshot.journey) journeys.push(authoredJourneyFrom(snapshot, journeys.length));
  await upsertAll(Journey, journeys, 'journeys');

  await upsertAll(
    Destination,
    (snapshot.destinations ?? []).map(destinationFrom),
    'destinations',
  );

  const tours = mergeGroupTours(snapshot.groupTours, snapshot.groupTourCards).map((record, index) =>
    groupTourFrom(record, index, snapshot.departures ?? []),
  );
  await upsertAll(GroupTour, tours, 'group tours');

  const hotels = [
    ...(snapshot.hotels ?? []).map((record, index) => hotelFrom(record, index)),
    ...(snapshot.featuredStays ?? []).map((record, index) =>
      hotelFrom(record, index, { editorsPick: true }),
    ),
  ];
  // featuredStays and hotels overlap by id; the editor's pick flag wins.
  const hotelsByLegacyId = new Map(hotels.map((hotel) => [hotel.legacyId, hotel]));
  await upsertAll(Hotel, [...hotelsByLegacyId.values()], 'stays');

  const testimonials = [
    ...(snapshot.testimonials ?? []).map((record, index) =>
      testimonialFrom(record, index, { placements: ['home', 'journey'] }),
    ),
    ...(snapshot.groupTestimonials ?? []).map((record, index) =>
      testimonialFrom(record, index + 100, { placements: ['group_tours'] }),
    ),
  ];
  await upsertAll(Testimonial, testimonials, 'testimonials');

  await upsertAll(TeamMember, (snapshot.team ?? []).map(teamMemberFrom), 'team members');
  await upsertAll(Article, (snapshot.journalArticles ?? []).map(articleFrom), 'journal articles');

  await seedFlags();

  console.log('\n  building indexes...');
  const models = await syncIndexes();
  console.log(`  indexes synced for ${models.length} collections`);

  await disconnectMongo();
  console.log('\nseed complete');
}

main().catch(async (error) => {
  console.error('\nseed failed:', error);
  await disconnectMongo().catch(() => {});
  process.exit(1);
});
