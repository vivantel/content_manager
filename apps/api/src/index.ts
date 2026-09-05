import 'dotenv/config';
import Fastify from 'fastify';
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { env, validateEnv } from '@vivascribe/shared/config';
import { api } from '@vivascribe/shared/config';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { requestLogger } from './middleware/request-logger';
import { generateRequestId } from '@vivascribe/shared/utils';
import pino from 'pino';

validateEnv();

const logger = pino({
  level: env.isDevelopment ? 'debug' : 'info',
  transport: env.isDevelopment ? { target: 'pino-pretty' } : undefined,
});

const app = Fastify({
  logger: logger,
  ajv: {
    customOptions: {
      strict: false,
    },
  },
}).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.decorateRequest('requestId', '');

app.addHook('onRequest', async (request, reply) => {
  request.requestId = generateRequestId();
  reply.header('x-request-id', request.requestId);
});

// Register routes after decorators
registerRoutes(app);

app.setErrorHandler(errorHandler);

const start = async () => {
  try {
    await app.listen({ port: 3001, host: '0.0.0.0' });
    logger.info(`🚀 API server running at http://localhost:3001${api.prefix}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();