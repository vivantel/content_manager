import { FastifyInstance } from 'fastify';

export function requestLogger(app: FastifyInstance) {
  app.addHook('onRequest', async (request) => {
    request.log.info({
      requestId: request.requestId,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    }, 'Incoming request');
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info({
      requestId: request.requestId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    }, 'Request completed');
  });

  app.addHook('onError', async (request, reply, error) => {
    request.log.error({
      requestId: request.requestId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      error: error.message,
      stack: error.stack,
    }, 'Request error');
  });
}