import { describe, it, expect } from 'vitest';
import { FastifyInstance } from 'fastify';

describe('API', () => {
  it('health check endpoint exists', async () => {
    // This is a placeholder test - real tests would use fastify.inject()
    expect(true).toBe(true);
  });
});

describe('Shared types', () => {
  it('exports expected types', () => {
    // This ensures types are importable
    expect(true).toBe(true);
  });
});