#!/usr/bin/env node
/*
 * Writes the generated OpenAPI document to openapi.json.
 *
 * Run in CI to diff the spec against the previous commit: an unintended
 * breaking change to a public endpoint shows up as a spec diff in review rather
 * than as a broken frontend after deploy.
 */
import { writeFile } from 'node:fs/promises';
import { buildApp } from '../src/app.js';

const app = await buildApp({ logger: false });
await app.ready();

const document = app.swagger();
await writeFile('openapi.json', `${JSON.stringify(document, null, 2)}\n`, 'utf8');

const paths = Object.keys(document.paths ?? {}).length;
console.log(`wrote openapi.json (${paths} paths)`);

await app.close();
process.exit(0);
