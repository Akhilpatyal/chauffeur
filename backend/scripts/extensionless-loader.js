/*
 * Module resolution hook used only by scripts/extract-frontend-data.js.
 *
 * The frontend is bundled by Vite, which resolves `./journeys` to
 * `./journeys.js`. Node does not, so importing those files directly fails.
 * Rather than edit the frontend to suit a build script, this hook appends the
 * extension when a bare relative specifier does not resolve on its own.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;

    for (const candidate of [`${specifier}.js`, `${specifier}/index.js`]) {
      try {
        const resolved = await nextResolve(candidate, context);
        if (existsSync(fileURLToPath(resolved.url))) return resolved;
      } catch {
        // try the next candidate
      }
    }
    throw error;
  }
}
