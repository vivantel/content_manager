import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { api } from '@vivascribe/shared/config';
import { ApiResponseSchema, PaginationParamsSchema, PaginatedResponseSchema } from '@vivascribe/shared/types';
import { OrganizationSchema, ContentPieceSchema, RepositorySchema, PromptVersionSchema } from '@vivascribe/shared/types';
import { prisma } from '../services/prisma';

export async function registerRoutes(app: FastifyInstance) {
  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.0.0',
  }));

  app.get('/ready', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'not ready', timestamp: new Date().toISOString() };
    }
  });

  // API v1 routes
  app.register(async function (fastify) {
    // All routes require auth
    fastify.addHook('preHandler', fastify.authMiddleware);

    // Get current user's organization
    const getOrgId = (request: { user?: { organizationId: string } }) => request.user?.organizationId;

    // Organizations
    fastify.get(`${api.prefix}/v1/organizations`, {
      schema: {
        querystring: PaginationParamsSchema,
        response: { 200: ApiResponseSchema(PaginatedResponseSchema(OrganizationSchema)) },
      },
    }, async (request, reply) => {
      const { page, limit, sort, order } = request.query;
      const orgId = getOrgId(request);
      
      const [organizations, total] = await Promise.all([
        prisma.organization.findMany({
          where: { id: orgId },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: sort ? { [sort]: order } : { createdAt: 'desc' },
        }),
        prisma.organization.count({ where: { id: orgId } }),
      ]);

      return reply.send({
        success: true,
        data: { items: organizations, total, page, limit, totalPages: Math.ceil(total / limit) },
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.get(`${api.prefix}/v1/organizations/:id`, {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 200: ApiResponseSchema(OrganizationSchema) },
      },
    }, async (request, reply) => {
      const orgId = getOrgId(request);
      const { id } = request.params;
      
      if (id !== orgId) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot access other organizations' },
          meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
        });
      }

      const organization = await prisma.organization.findUnique({ where: { id } });
      
      if (!organization) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
          meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
        });
      }

      return reply.send({
        success: true,
        data: organization,
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
      const { page, limit, sort, order, isActive } = request.query;
      const orgId = getOrgId(request);
      
      const where: Record<string, unknown> = { organizationId: orgId };
      if (isActive !== undefined) where.isActive = isActive;

      const [repositories, total] = await Promise.all([
        prisma.repository.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: sort ? { [sort]: order } : { createdAt: 'desc' },
        }),
        prisma.repository.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: { items: repositories, total, page, limit, totalPages: Math.ceil(total / limit) },
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.post(`${api.prefix}/v1/repositories`, {
      schema: {
        body: RepositorySchema.omit({ id: true, createdAt: true, updatedAt: true, organizationId: true }),
        response: { 201: ApiResponseSchema(RepositorySchema) },
      },
    }, async (request, reply) => {
      const orgId = getOrgId(request);
      const data = request.body;
      
      const repository = await prisma.repository.create({
        data: {
          ...data,
          organizationId: orgId,
          eventSources: data.eventSources || {},
        },
      });

      return reply.status(201).send({
        success: true,
        data: repository,
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.patch(`${api.prefix}/v1/repositories/:id`, {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: RepositorySchema.partial().omit({ id: true, organizationId: true, createdAt: true, updatedAt: true }),
        response: { 200: ApiResponseSchema(RepositorySchema) },
      },
    }, async (request, reply) => {
      const orgId = getOrgId(request);
      const { id } = request.params;
      
      const repository = await prisma.repository.findFirst({
        where: { id, organizationId: orgId },
      });
      
      if (!repository) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Repository not found' },
          meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
        });
      }

      const updated = await prisma.repository.update({
        where: { id },
        data: request.body,
      });

      return reply.send({
        success: true,
        data: updated,
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.delete(`${api.prefix}/v1/repositories/:id`, {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 200: ApiResponseSchema(z.object({ success: z.boolean() })) },
      },
    }, async (request, reply) => {
      const orgId = getOrgId(request);
      const { id } = request.params;
      
      const repository = await prisma.repository.findFirst({
        where: { id, organizationId: orgId },
      });
      
      if (!repository) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Repository not found' },
          meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
        });
      }

      await prisma.repository.delete({ where: { id } });

      return reply.send({
        success: true,
        data: { success: true },
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
      const { page, limit, sort, order, status, contentType, repositoryId } = request.query;
      const orgId = getOrgId(request);
      
      const where: Record<string, unknown> = { organizationId: orgId };
      if (status) where.status = status;
      if (contentType) where.contentType = contentType;
      if (repositoryId) where.repositoryId = repositoryId;

      const [content, total] = await Promise.all([
        prisma.contentPiece.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: sort ? { [sort]: order } : { updatedAt: 'desc' },
          include: {
            repository: { select: { id: true, name: true, fullName: true } },
            promptVersion: { select: { id: true, name: true } },
          },
        }),
        prisma.contentPiece.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: { items: content, total, page, limit, totalPages: Math.ceil(total / limit) },
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.get(`${api.prefix}/v1/content/:id`, {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 200: ApiResponseSchema(ContentPieceSchema) },
      },
    }, async (request, reply) => {
      const orgId = getOrgId(request);
      const { id } = request.params;
      
      const piece = await prisma.contentPiece.findFirst({
        where: { id, organizationId: orgId },
        include: {
          repository: { select: { id: true, name: true, fullName: true, provider: true } },
          promptVersion: { select: { id: true, name: true, template: true } },
          versions: { take: 10, orderBy: { createdAt: 'desc' } },
          reviews: { include: { reviewer: { select: { id: true, name: true, email: true } } } },
        },
      });
      
      if (!piece) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content piece not found' },
          meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
        });
      }

      return reply.send({
        success: true,
        data: piece,
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
      const orgId = getOrgId(request);
      const { id } = request.params;
      const userId = request.user.id;
      
      const piece = await prisma.contentPiece.findFirst({
        where: { id, organizationId: orgId },
      });
      
      if (!piece) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content piece not found' },
          meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
        });
      }

      // Create version before update
      await prisma.contentVersion.create({
        data: {
          contentPieceId: id,
          content: piece.content,
          contentHtml: piece.contentHtml,
          frontMatter: piece.frontMatter,
          editorId: userId,
          changeSummary: 'Auto-save',
        },
      });

      const updated = await prisma.contentPiece.update({
        where: { id },
        data: request.body,
      });

      return reply.send({
        success: true,
        data: updated,
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.post(`${api.prefix}/v1/content`, {
      schema: {
        body: ContentPieceSchema.omit({ id: true, createdAt: true, updatedAt: true, organizationId: true }),
        response: { 201: ApiResponseSchema(ContentPieceSchema) },
      },
    }, async (request, reply) => {
      const orgId = getOrgId(request);
      const data = request.body;
      
      const piece = await prisma.contentPiece.create({
        data: {
          ...data,
          organizationId: orgId,
        },
      });

      return reply.status(201).send({
        success: true,
        data: piece,
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
      const orgId = getOrgId(request);
      const { id } = request.params;
      const { scheduleAt } = request.body;
      const userId = request.user.id;
      
      const piece = await prisma.contentPiece.findFirst({
        where: { id, organizationId: orgId },
      });
      
      if (!piece) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content piece not found' },
          meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
        });
      }

      const updateData: Record<string, unknown> = {
        status: 'approved',
      };
      
      if (scheduleAt) {
        updateData.status = 'scheduled';
        updateData.scheduledAt = new Date(scheduleAt);
      }

      const updated = await prisma.contentPiece.update({
        where: { id },
        data: updateData,
      });

      // Create review record
      await prisma.contentReview.create({
        data: {
          contentPieceId: id,
          reviewerId: userId,
          action: 'approve',
        },
      });

      return reply.send({
        success: true,
        data: updated,
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
      const orgId = getOrgId(request);
      const { id } = request.params;
      const { comment } = request.body;
      const userId = request.user.id;
      
      const piece = await prisma.contentPiece.findFirst({
        where: { id, organizationId: orgId },
      });
      
      if (!piece) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content piece not found' },
          meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
        });
      }

      const updated = await prisma.contentPiece.update({
        where: { id },
        data: { status: 'changes_requested' },
      });

      await prisma.contentReview.create({
        data: {
          contentPieceId: id,
          reviewerId: userId,
          action: 'request_changes',
          comment,
        },
      });

      return reply.send({
        success: true,
        data: updated,
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
      const orgId = getOrgId(request);
      const { id } = request.params;
      const { reason } = request.body;
      const userId = request.user.id;
      
      const piece = await prisma.contentPiece.findFirst({
        where: { id, organizationId: orgId },
      });
      
      if (!piece) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content piece not found' },
          meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
        });
      }

      const updated = await prisma.contentPiece.update({
        where: { id },
        data: { status: 'rejected' },
      });

      await prisma.contentReview.create({
        data: {
          contentPieceId: id,
          reviewerId: userId,
          action: 'reject',
          comment: reason,
        },
      });

      return reply.send({
        success: true,
        data: updated,
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
      const { page, limit, sort, order, type, contentType } = request.query;
      const orgId = getOrgId(request);
      
      const where: Record<string, unknown> = { organizationId: orgId, isActive: true };
      if (type) where.type = type;
      if (contentType) where.contentType = contentType;

      const [prompts, total] = await Promise.all([
        prisma.promptVersion.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: sort ? { [sort]: order } : { updatedAt: 'desc' },
        }),
        prisma.promptVersion.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: { items: prompts, total, page, limit, totalPages: Math.ceil(total / limit) },
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.post(`${api.prefix}/v1/prompts`, {
      schema: {
        body: PromptVersionSchema.omit({ id: true, createdAt: true, updatedAt: true, organizationId: true, version: true }),
        response: { 201: ApiResponseSchema(PromptVersionSchema) },
      },
    }, async (request, reply) => {
      const orgId = getOrgId(request);
      const data = request.body;
      
      // Check if prompt with same name/type/contentType exists for versioning
      const existing = await prisma.promptVersion.findFirst({
        where: {
          organizationId: orgId,
          name: data.name,
          type: data.type,
          contentType: data.contentType,
        },
        orderBy: { version: 'desc' },
      });

      const prompt = await prisma.promptVersion.create({
        data: {
          ...data,
          organizationId: orgId,
          version: (existing?.version || 0) + 1,
        },
      });

      return reply.status(201).send({
        success: true,
        data: prompt,
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    fastify.patch(`${api.prefix}/v1/prompts/:id`, {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: PromptVersionSchema.partial().omit({ id: true, organizationId: true, createdAt: true, updatedAt: true, version: true }),
        response: { 200: ApiResponseSchema(PromptVersionSchema) },
      },
    }, async (request, reply) => {
      const orgId = getOrgId(request);
      const { id } = request.params;
      
      const prompt = await prisma.promptVersion.findFirst({
        where: { id, organizationId: orgId },
      });
      
      if (!prompt) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Prompt not found' },
          meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
        });
      }

      const updated = await prisma.promptVersion.update({
        where: { id },
        data: request.body,
      });

      return reply.send({
        success: true,
        data: updated,
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
      // This is handled by Supabase Edge Function
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
      // This is handled by Supabase Edge Function
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
      // This is handled by Supabase Edge Function
      return reply.send({ success: true, eventsProcessed: 0 });
    });

    // Event log
    fastify.get(`${api.prefix}/v1/events`, {
      schema: {
        querystring: PaginationParamsSchema.extend({
          repositoryId: z.string().uuid().optional(),
          type: z.string().optional(),
        }),
        response: { 200: ApiResponseSchema(PaginatedResponseSchema(z.object({
          id: z.string().uuid(),
          repositoryId: z.string().uuid(),
          type: z.string(),
          providerEventId: z.string(),
          payload: z.record(z.unknown()),
          processedAt: z.date().nullable(),
          createdAt: z.date(),
          repository: z.object({ id: z.string().uuid(), name: z.string(), fullName: z.string() }).optional(),
        }))) },
      },
    }, async (request, reply) => {
      const { page, limit, sort, order, repositoryId, type } = request.query;
      const orgId = getOrgId(request);
      
      const where: Record<string, unknown> = {
        repository: { organizationId: orgId },
      };
      if (repositoryId) where.repositoryId = repositoryId;
      if (type) where.type = type;

      const [events, total] = await Promise.all([
        prisma.repoEvent.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: sort ? { [sort]: order } : { createdAt: 'desc' },
          include: {
            repository: { select: { id: true, name: true, fullName: true } },
          },
        }),
        prisma.repoEvent.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: { items: events, total, page, limit, totalPages: Math.ceil(total / limit) },
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });

    // Analytics
    fastify.get(`${api.prefix}/v1/analytics/summary`, {
      schema: {
        querystring: z.object({
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
        }),
        response: { 200: ApiResponseSchema(z.object({
          totalContent: z.number(),
          contentByType: z.record(z.number()),
          contentByStatus: z.record(z.number()),
          contentByChannel: z.record(z.number()),
          avgReviewTime: z.number(),
          publishSuccessRate: z.number(),
        })) },
      },
    }, async (request, reply) => {
      const orgId = getOrgId(request);
      const { startDate, endDate } = request.query;
      
      const where: Record<string, unknown> = { organizationId: orgId };
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
        if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
      }

      const [totalContent, byType, byStatus, byChannel] = await Promise.all([
        prisma.contentPiece.count({ where }),
        prisma.contentPiece.groupBy({ by: ['contentType'], where, _count: true }),
        prisma.contentPiece.groupBy({ by: ['status'], where, _count: true }),
        prisma.publishJob.groupBy({ by: ['channelId'], where: { contentPiece: { organizationId: orgId } }, _count: true }),
      ]);

      const channelNames = await prisma.publishingChannel.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
      });
      const channelMap = Object.fromEntries(channelNames.map(c => [c.id, c.name]));

      return reply.send({
        success: true,
        data: {
          totalContent,
          contentByType: Object.fromEntries(byType.map(t => [t.contentType, t._count])),
          contentByStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
          contentByChannel: Object.fromEntries(byChannel.map(c => [channelMap[c.channelId] || c.channelId, c._count])),
          avgReviewTime: 0, // TODO: calculate
          publishSuccessRate: 0, // TODO: calculate
        },
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    });
  });
}