import fp from 'fastify-plugin';
import compress from '@fastify/compress';
import etag from '@fastify/etag';
import { constants as zlibConstants } from 'node:zlib';

/*
 * Transport-level performance.
 *
 * Two cheap wins that together cut most of the bytes this API sends:
 *
 *  - Compression. The content listings are repetitive JSON, which gzips to
 *    roughly a fifth of its size. Brotli is offered first because every
 *    browser that matters supports it and it beats gzip on this kind of text.
 *
 *  - ETags. A listing that has not changed answers a repeat request with a
 *    304 and an empty body. Combined with the Cache-Control headers the
 *    content routes already set, a CDN revalidates cheaply instead of
 *    re-downloading a payload nothing has touched.
 *
 * Neither does anything for the write path, which is deliberately untouched:
 * a lead submission is small, infrequent and must not spend time compressing.
 */
async function performancePlugin(fastify) {
  await fastify.register(compress, {
    /*
     * Below ~1 KB the compression overhead costs more than the bytes saved,
     * and most small responses here are error envelopes and lead
     * acknowledgements where latency matters more than size.
     */
    threshold: 1024,

    /*
     * gzip is offered ahead of brotli on purpose.
     *
     * Measured on this API: brotli at the default quality more than halved
     * throughput on a single process (966 -> 454 req/s) and pushed p99 from
     * 207 ms to over a second. Brotli is the right choice for assets
     * compressed once at build time; for responses compressed per request it
     * buys a few percent of size for a large slice of the CPU budget.
     *
     * Both are tuned down below. A CDN sitting in front of these cacheable
     * GETs can re-compress at maximum quality once and serve that from the
     * edge, which is where the expensive setting belongs.
     */
    encodings: ['gzip', 'br', 'deflate'],

    /* Level 6 is the usual sweet spot: within a few percent of level 9 on
     * JSON for roughly a third of the CPU. */
    zlibOptions: { level: 6 },
    /* Brotli quality 4 is the comparable setting on the other side. */
    brotliOptions: { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 4 } },

    /* Only compress what benefits: JSON, text, SVG, CSV exports. */
    customTypes: /^text\/|\+json$|\/json$|\/csv$|\+xml$/,
    /* Compressing an already-compressed image wastes CPU for nothing. */
    removeContentLengthHeader: false,
  });

  /*
   * Weak ETags: the body is compared after serialisation, so two responses
   * with the same data match even if the compression level differed.
   */
  await fastify.register(etag, { weak: true });
}

export default fp(performancePlugin, { name: 'performance' });
