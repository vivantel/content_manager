import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '@vivascribe/shared/config';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(supabase.url, supabase.serviceRoleKey);

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      organizationId: string;
      role: string;
    };
    requestId: string;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
      meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
    });
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    }

    // Get user's organization membership
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return reply.status(403).send({
        success: false,
        error: { code: 'NO_ORGANIZATION', message: 'User not member of any organization' },
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    }

    request.user = {
      id: user.id,
      email: user.email,
      organizationId: membership.organization_id,
      role: membership.role,
    };
  } catch (err) {
    return reply.status(401).send({
      success: false,
      error: { code: 'AUTH_ERROR', message: 'Authentication failed' },
      meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
    });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
        meta: { timestamp: new Date().toISOString(), requestId: request.requestId },
      });
    }
  };
}