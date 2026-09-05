import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { api } from '@vivascribe/shared/config';
import { ApiResponseSchema, PaginationParamsSchema, PaginatedResponseSchema } from '@vivascribe/shared/types';
import { OrganizationSchema, ContentPieceSchema, RepositorySchema, PromptVersionSchema } from '@vivascribe/shared/types';
import { generateRequestId } from '@vivascribe/shared/utils';

export async function registerRoutes(app: FastifyInstance) {
  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.0.0',
  }));

  app.get('/ready', async () => ({
    status: 'ready',
    timestamp: new Date().toISOString(),
  }));

  // API v1 routes
  app.register(async function (fastify) {
    // All routes require auth
    fastify.addHook('preHandler', fastify.authMiddleware);

    // Organizations
    fastify.get(`${api.prefix}/v1/organizations`, {
      schema: {
        querystring: PaginationParamsSchema,
        response: { 200: ApiResponseSchema(PaginatedResponseSchema(OrganizationSchema)) },
      },
    }, async (request, reply) => {
      const { page, limit } = request.query;
      // TODO: Implement with Prisma
      return reply.send({
        success: true,
        data: { items: [], total: 0, page, limit, totalPages: 0 },
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.get(`${api.prefix}/v1/organizations/:id`, {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 200: ApiResponseSchema(OrganizationSchema) },
      },
    }, async (request, reply) => {
      // TODO: Implement with Prisma
      return reply.send({
        success: true,
        data: null,
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    // Repositories
    fastify.get(`${api.prefix}/v1/repositories`, {
      schema: {
        querystring: PaginationParamsSchema.extend({
          isActive: z.coerce.boolean().optional(),
        }),
        response: { 200: ApiResponseSchema(PaginatedResponseSchema(RepositorySchema)) },
      },
    }, async (request, reply) => {
      const { page, limit } = request.query;
      // TODO: Implement with Prisma
      return reply.send({
        success: true,
        data: { items: [], total: 0, page, limit, totalPages: 0 },
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.post(`${api.prefix}/v1/repositories`, {
      schema: {
        body: RepositorySchema.omit({ id: true, createdAt: true, updatedAt: true, organizationId: true }),
        response: { 201: ApiResponseSchema(RepositorySchema) },
      },
    }, async (request, reply) => {
      // TODO: Implement with Prisma + GitHub App installation
      return reply.status(201).send({
        success: true,
        data: null,
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    // Content Pieces
    fastify.get(`${api.prefix}/v1/content`, {
      schema: {
        querystring: PaginationParamsSchema.extend({
          status: z.string().optional(),
          contentType: z.string().optional(),
          repositoryId: z.string().uuid().optional(),
        }),
        response: { 200: ApiResponseSchema(PaginatedResponseSchema(ContentPieceSchema)) },
      },
    }, async (request, reply) => {
      const { page, limit } = request.query;
      // TODO: Implement with Prisma
      return reply.send({
        success: true,
        data: { items: [], total: 0, page, limit, totalPages: 0 },
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.get(`${api.prefix}/v1/content/:id`, {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 200: ApiResponseSchema(ContentPieceSchema) },
      },
    }, async (request, reply) => {
      // TODO: Implement with Prisma
      return reply.send({
        success: true,
        data: null,
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.patch(`${api.prefix}/v1/content/:id`, {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: ContentPieceSchema.partial().omit({ id: true, organizationId: true, createdAt: true, updatedAt: true }),
        response: { 200: ApiResponseSchema(ContentPieceSchema) },
      },
    }, async (request, reply) => {
      // TODO: Implement with Prisma
      return reply.send({
        success: true,
        data: null,
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.post(`${api.prefix}/v1/content/:id/approve`, {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ scheduleAt: z.string().datetime().optional() }),
        response: { 200: ApiResponseSchema(ContentPieceSchema) },
      },
    }, async (request, reply) => {
      // TODO: Implement approval + scheduling
      return reply.send({
        success: true,
        data: null,
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.post(`${api.prefix}/v1/content/:id/request-changes`, {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ comment: z.string() }),
        response: { 200: ApiResponseSchema(ContentPieceSchema) },
      },
    }, async (request, reply) => {
      // TODO: Implement request changes
      return reply.send({
        success: true,
        data: null,
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.post(`${api.prefix}/v1/content/:id/reject`, {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ reason: z.string() }),
        response: { 200: ApiResponseSchema(ContentPieceSchema) },
      },
    }, async (request, reply) => {
      // TODO: Implement rejection
      return reply.send({
        success: true,
        data: null,
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    // Prompts
    fastify.get(`${api.prefix}/v1/prompts`, {
      schema: {
        querystring: PaginationParamsSchema.extend({
          type: z.string().optional(),
          contentType: z.string().optional(),
        }),
        response: { 200: ApiResponseSchema(PaginatedResponseSchema(PromptVersionSchema)) },
      },
    }, async (request, reply) => {
      const { page, limit } = request.query;
      // TODO: Implement with Prisma
      return reply.send({
        success: true,
        data: { items: [], total: 0, page, limit, totalPages: 0 },
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.post(`${api.prefix}/v1/prompts`, {
      schema: {
        body: PromptVersionSchema.omit({ id: true, createdAt: true, updatedAt: true, organizationId: true, version: true }),
        response: { 201: ApiResponseSchema(PromptVersionSchema) },
      },
    }, async (request, reply) => {
      // TODO: Implement with Prisma
      return reply.status(201).send({
        success: true,
        data: null,
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    // Webhooks
    fastify.post(`${api.prefix}/v1/webhooks/github`, {
      schema: {
        body: z.object({}).passthrough(),
        headers: z.object({
          'x-github-event': z.string(),
          'x-github-delivery': z.string(),
          'x-hub-signature-256': z.string().optional(),
        }),
      },
    }, async (request, reply) => {
      // TODO: Verify signature, store webhook event, process
      return reply.send({ success: true });
    });

    fastify.post(`${api.prefix}/v1/webhooks/gitlab`, {
      schema: {
        body: z.object({}).passthrough(),
        headers: z.object({
          'x-gitlab-event': z.string(),
          'x-gitlab-token': z.string().optional(),
        }),
      },
    }, async (request, reply) => {
      // TODO: Verify token, store webhook event, process
      return reply.send({ success: true });
    });

    // Ingest (for GitHub Actions polling)
    fastify.post(`${api.prefix}/v1/ingest/poll`, {
      schema: {
        body: z.object({
          repositoryIds: z.array(z.string().uuid()),
          since: z.string().datetime().optional(),
        }),
      },
    }, async (request, reply) => {
      // TODO: Fetch events from GitHub/GitLab, store, trigger generation
      return reply.send({ success: true, eventsProcessed: 0 });
    });
  });
}