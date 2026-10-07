import { zodToJsonSchema } from 'zod-to-json-schema';
import { validationFailed } from './errors.js';

/*
 * One source of truth per endpoint: a Zod schema that both validates the
 * request and documents it.
 *
 * Fastify's own AJV pipeline is replaced by the compilers below - AJV would
 * otherwise run first and reject payloads before Zod's coercions and
 * transforms (trimming, lowercasing emails, splitting CSV query params) ever
 * got a chance. The `schema` block on each route is then purely descriptive
 * and feeds @fastify/swagger.
 */
export function zodValidatorCompiler() {
  /*
   * Pass-through. Validation already happened in the preValidation hook below,
   * where we control the error shape. The data must be returned unchanged:
   * Fastify assigns whatever comes back onto request.body/query/params, so
   * returning nothing here would wipe the validated payload.
   */
  return (data) => ({ value: data });
}

export function zodSerializerCompiler() {
  // Pass-through serialisation. Fastify would otherwise strip any property not
  // named in the response schema, which silently drops fields when a schema
  // drifts from the handler.
  return (data) => JSON.stringify(data);
}

function formatIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    code: issue.code,
    message: issue.message,
  }));
}

/*
 * Builds a preValidation hook. Parsed values replace the raw ones on the
 * request, so handlers only ever see validated, coerced data.
 */
export function validate({ body, query, params }) {
  return async function validateRequest(request) {
    const issues = [];

    if (body) {
      const result = body.safeParse(request.body ?? {});
      if (result.success) request.body = result.data;
      else issues.push(...formatIssues(result.error).map((i) => ({ ...i, in: 'body' })));
    }
    if (query) {
      const result = query.safeParse(request.query ?? {});
      if (result.success) request.query = result.data;
      else issues.push(...formatIssues(result.error).map((i) => ({ ...i, in: 'query' })));
    }
    if (params) {
      const result = params.safeParse(request.params ?? {});
      if (result.success) request.params = result.data;
      else issues.push(...formatIssues(result.error).map((i) => ({ ...i, in: 'params' })));
    }

    if (issues.length > 0) throw validationFailed(issues);
  };
}

/* Zod -> JSON Schema for the OpenAPI document. */
export function docSchema(schema, name) {
  const generated = zodToJsonSchema(schema, {
    name,
    target: 'openApi3',
    $refStrategy: 'none',
  });
  return name ? generated.definitions[name] : generated;
}

/* Convenience: the standard error envelope, for response documentation. */
export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        requestId: { type: 'string' },
        details: {},
      },
      required: ['code', 'message'],
    },
  },
};
