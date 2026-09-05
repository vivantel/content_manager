import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const requestId = request.requestId || 'unknown';
  const timestamp = new Date().toISOString();

  // Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.flatten().fieldErrors,
      },
      meta: { timestamp, requestId },
    });
  }

  // Prisma errors
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return reply.status(409).send({
        success: false,
        error: { code: 'CONFLICT', message: 'Resource already exists' },
        meta: { timestamp, requestId },
      });
    }
    if (error.code === 'P2025') {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
        meta: { timestamp, requestId },
      });
    }
  }

  // Fastify validation errors
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: error.validation },
      meta: { timestamp, requestId },
    });
  }

  // Generic error
  request.log.error({ err: error, requestId }, 'Request error');
  
  return reply.status(500).send({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    meta: { timestamp, requestId },
  });
}