#!/usr/bin/env node
/*
 * Snapshots the hardcoded frontend data into seed/data/*.json.
 *
 * Two steps rather than one on purpose: the seed script must run inside a
 * container that only contains the backend, so it cannot import from
 * ../frontend. This script bridges that gap during development, and the JSON it
 * produces is committed.
 *
 * Re-run it whenever the frontend data files change and the seed needs to catch
 * up:  npm run extract:frontend-data
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* See scripts/extensionless-loader.js for why this is needed. */
register('./extensionless-loader.js', import.meta.url);

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendData = path.resolve(here, '../../frontend/src/data');
const outDir = path.resolve(here, '../seed/data');

const SOURCES = [
  { file: 'journeys.js', exports: ['journeys'] },
  { file: 'destinations.js', exports: ['destinations'] },
  { file: 'groupTours.js', exports: ['groupTours'] },
  { file: 'groupToursPage.js', exports: ['groupTourCards', 'departures', 'groupTestimonials'] },
  { file: 'hotels.js', exports: ['hotels', 'featuredStays'] },
  { file: 'testimonials.js', exports: ['testimonials'] },
  { file: 'team.js', exports: ['team'] },
  { file: 'journal.js', exports: ['journalArticles'] },
  { file: 'journeyDetail.js', exports: ['journey', 'itinerary', 'quickStats', 'highlights', 'included', 'routeStops'] },
];

async function main() {
  await mkdir(outDir, { recursive: true });
  const snapshot = {};

  for (const source of SOURCES) {
    const modulePath = path.join(frontendData, source.file);
    const module = await import(pathToFileURL(modulePath).href);

    for (const name of source.exports) {
      if (module[name] === undefined) {
        console.warn(`  ! ${source.file} does not export ${name}, skipping`);
        continue;
      }
      snapshot[name] = module[name];
    }
    console.log(`  read ${source.file}`);
  }

  const outFile = path.join(outDir, 'frontend-snapshot.json');
  await writeFile(outFile, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  const counts = Object.entries(snapshot)
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.length : 1}`)
    .join(' ');
  console.log(`\nwrote ${path.relative(process.cwd(), outFile)}\n  ${counts}`);
}

main().catch((error) => {
  console.error('extract failed:', error);
  process.exit(1);
});
