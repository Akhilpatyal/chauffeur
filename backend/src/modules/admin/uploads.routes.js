import { z } from 'zod';
import { env } from '../../config/env.js';
import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { badRequest } from '../../lib/errors.js';
import { assertUploadable, buildKey, uploadBuffer, presignUpload } from '../../services/storage.js';
import { recordAudit } from '../../services/audit.js';

const FOLDERS = ['journeys', 'destinations', 'hotels', 'group-tours', 'team', 'testimonials', 'articles', 'misc'];

const presignBody = z.object({
  folder: z.enum(FOLDERS),
  filename: z.string().max(260),
  contentType: z.string().max(100),
});

/*
 * Two upload paths, for two different situations:
 *
 *  - The proxied POST is simple and works everywhere, which is what you want
 *    for a content editor attaching a 400 KB photo.
 *  - The presigned PUT sends bytes straight from the browser to the bucket.
 *    That keeps large bodies off the API instances entirely, so an editor
 *    uploading a gallery cannot saturate the same workers serving the site.
 */
export default async function uploadRoutes(fastify) {
  fastify.post(
    '/uploads',
    {
      preHandler: fastify.requirePermission('uploads:write'),
      schema: {
        tags: ['admin:ops'],
        summary: 'Upload an image (multipart)',
        description:
          `Accepts a single image field named \`file\`, up to ${Math.round(env.UPLOAD_MAX_BYTES / 1024 / 1024)} MB. ` +
          'Optional `folder` field selects the prefix. Returns the public URL and the object key.',
        consumes: ['multipart/form-data'],
        security: [{ bearerAuth: [] }],
        response: {
          201: {
            description: 'Uploaded',
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: { url: { type: 'string' }, key: { type: 'string' } },
              },
            },
          },
          400: { description: 'Unsupported type or too large', ...errorResponseSchema },
          503: { description: 'Storage is not configured', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      const file = await request.file();
      if (!file) throw badRequest('Attach an image in a field named "file".');

      const folder = FOLDERS.includes(file.fields?.folder?.value)
        ? file.fields.folder.value
        : 'misc';

      // toBuffer() throws once the configured limit is exceeded, so an
      // oversized upload is rejected without being fully read into memory.
      let buffer;
      try {
        buffer = await file.toBuffer();
      } catch {
        throw badRequest(`Images must be under ${Math.round(env.UPLOAD_MAX_BYTES / 1024 / 1024)} MB.`);
      }

      assertUploadable({ contentType: file.mimetype, size: buffer.length });

      const key = buildKey(folder, file.filename, file.mimetype);
      const result = await uploadBuffer({ buffer, key, contentType: file.mimetype });

      await recordAudit({
        request,
        action: 'upload.create',
        entity: 'asset',
        entityId: key,
        entityLabel: file.filename,
        after: { key, bytes: buffer.length, contentType: file.mimetype },
      });

      return reply.status(201).send({ data: result });
    },
  );

  fastify.post(
    '/uploads/presign',
    {
      preHandler: fastify.requirePermission('uploads:write'),
      preValidation: validate({ body: presignBody }),
      schema: {
        tags: ['admin:ops'],
        summary: 'Get a presigned URL for a direct browser upload',
        description: 'PUT the file to `uploadUrl` within 5 minutes, then save `publicUrl`.',
        security: [{ bearerAuth: [] }],
        body: docSchema(presignBody, 'PresignUpload'),
        response: {
          200: { description: 'Presigned upload target', type: 'object' },
          400: { description: 'Unsupported content type', ...errorResponseSchema },
        },
      },
    },
    async (request) => ({ data: await presignUpload(request.body) }),
  );
}
