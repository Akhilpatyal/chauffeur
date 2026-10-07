import fp from 'fastify-plugin';
import mongoose from 'mongoose';
import { AppError } from '../lib/errors.js';
import { captureError } from '../config/sentry.js';
import { env } from '../config/env.js';

/*
 * The single place an error turns into a response.
 *
 * Two invariants:
 *   1. The body always has the shape { error: { code, message, requestId } }.
 *      The frontend and the admin app can rely on that without sniffing.
 *   2. Nothing internal leaks. Stack traces, driver messages and index names
 *      go to the logs and to Sentry, never to the client.
 */
function translate(error) {
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, code: error.code, message: error.message, details: error.details };
  }

  // Duplicate key: surface which field collided, not the raw index definition.
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0] ?? 'value';
    return {
      statusCode: 409,
      code: 'DUPLICATE',
      message: `That ${field} is already in use.`,
      details: { field },
    };
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: 422,
      code: 'VALIDATION_FAILED',
      message: 'Some fields need attention.',
      details: Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
    };
  }

  if (error instanceof mongoose.Error.CastError) {
    return { statusCode: 400, code: 'BAD_REQUEST', message: `Invalid value for ${error.path}.` };
  }

  // Fastify's own errors carry a statusCode; trust it for 4xx only.
  if (error?.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return {
      statusCode: error.statusCode,
      code: error.code ?? 'REQUEST_ERROR',
      message: error.message,
    };
  }

  return {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong on our side. Please try again.',
  };
}

async function errorHandlerPlugin(fastify) {
  fastify.setErrorHandler((error, request, reply) => {
    const translated = translate(error);
    const isServerError = translated.statusCode >= 500;

    const logPayload = {
      err: error,
      requestId: request.correlationId,
      url: request.url,
      method: request.method,
      statusCode: translated.statusCode,
      userId: request.user?.id,
    };

    if (isServerError) {
      request.log.error(logPayload, 'request failed');
      captureError(error, {
        requestId: request.correlationId,
        route: request.routeOptions?.url ?? request.url,
      });
    } else {
      request.log.info(logPayload, 'request rejected');
    }

    reply.status(translated.statusCode).send({
      error: {
        code: translated.code,
        message: translated.message,
        ...(translated.details ? { details: translated.details } : {}),
        requestId: request.correlationId,
        // Only in development, and only for genuine bugs.
        ...(isServerError && env.isDevelopment ? { stack: error.stack } : {}),
      },
    });
  });

  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `No route for ${request.method} ${request.url}.`,
        requestId: request.correlationId,
      },
    });
  });
}

export default fp(errorHandlerPlugin, { name: 'error-handler' });
