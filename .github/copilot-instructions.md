# GitHub Copilot Instructions for VivaScribe

## Project Overview
VivaScribe is a content management ecosystem that watches git repositories (GitHub/GitLab), generates content from commits/PRs/releases using AI, provides a web dashboard for review/editing, and publishes to multiple channels (blog, social, newsletter).

## Tech Stack
- **Monorepo**: TurboRepo with `apps/api`, `apps/web`, `packages/shared`
- **Backend**: Fastify + TypeScript, Supabase (PostgreSQL, Auth, Edge Functions, Realtime, Storage)
- **Frontend**: React 18 + Vite + Tailwind CSS, TanStack Query, Zustand
- **Database**: Prisma ORM with Supabase RLS for multi-tenancy
- **Deployment**: Vercel (frontend) + Supabase (backend)
- **CI/CD**: GitHub Actions on public cover repo
- **LLM**: Free tier providers only (GitHub Models → OpenRouter → NVIDIA NIM → Google AI Studio)

## Coding Conventions

### TypeScript
- Strict mode enabled everywhere
- Use `zod` for all runtime validation (API inputs, DB outputs, forms)
- Use `neverthrow` Result types for error handling: `Result<T, E>`
- Prefer `const` over `let`, functional patterns over classes
- Colocate types with their usage

### API (Fastify)
- All routes use `fastify-type-provider-zod` for schema validation
- Response format: `{ success: boolean, data?: T, error?: { code, message }, meta?: { timestamp, requestId } }`
- Pagination: `page`, `limit`, `sort`, `order` query params
- Auth via Supabase JWT in `Authorization: Bearer` header
- All queries scoped to `org_id` from JWT claim

### Database (Prisma + Supabase RLS)
- Every table with org data has `organizationId` field
- RLS policies enforce `org_id = auth.jwt()->>'org_id'` at database level
- Prisma middleware adds `WHERE organizationId = ?` as defense in depth
- Use `Json` fields for flexible config (eventSources, channel config, etc.)

### Frontend (React)
- TanStack Query for server state (5min staleTime, 10min gcTime)
- Zustand for client state (auth, UI)
- React Router v6 for routing
- Tailwind CSS for styling (custom primary color palette)
- Components in `src/components/`, pages in `src/pages/`, hooks in `src/hooks/`

### Testing
- Unit: Vitest, colocated `*.test.ts`
- E2E: Playwright in `apps/web/e2e/`
- API tests use `fastify.inject()`
- React tests use `@testing-library/react`

## Key Patterns

### Shared Package Exports
```typescript
// packages/shared/src/types/index.ts
export const EntitySchema = z.object({ id: z.string().uuid(), ... });
export type Entity = z.infer<typeof EntitySchema>;
```

### API Route
```typescript
fastify.get('/api/v1/entities', {
  schema: {
    querystring: PaginationParamsSchema,
    response: { 200: ApiResponseSchema(PaginatedResponseSchema(EntitySchema)) }
  }
}, async (request, reply) => {
  const { page, limit } = request.query;
  // Prisma query automatically scoped to request.user.organizationId
});
```

### React Query Hook
```typescript
export function useEntities(params) {
  return useQuery({
    queryKey: ['entities', params],
    queryFn: () => axiosInstance.get('/api/v1/entities', { params }).then(r => r.data.data),
  });
}
```

### Component
```typescript
export function EntityList() {
  const { data, isLoading } = useEntities({ page: 1, limit: 20 });
  if (isLoading) return <Spinner />;
  return <Table data={data?.items} />;
}
```

## Free Tier Constraints (Critical)
- **No paid services**: All infrastructure on Vercel Free, Supabase Free, GitHub Free
- **LLM fallback chain**: GitHub Models → OpenRouter free → NVIDIA NIM free → Google AI Studio free
- **Caching**: Aggressive 24h TTL for LLM responses
- **Actions**: Public cover repo for CI/CD + polling (unlimited minutes)
- **Database**: 500MB limit - archive old data, compress versions
- **Bandwidth**: 100GB/month - optimize assets, enable compression

## AI Development Workflow
1. Read relevant decisions/procedures from `docs/`
2. Write/update Zod schemas in `packages/shared/src/types/`
3. Write tests first (unit + integration)
4. Implement API route with validation
5. Implement React component with TanStack Query
6. Run `npm run lint`, `npm run typecheck`, `npm run test`
7. Create PR with conventional commit message

## Security Rules
- Never log secrets or tokens
- All DB access via Prisma (RLS enforced at DB level)
- Webhook endpoints verify signatures
- Supabase JWT short-lived, refresh via client
- Encrypt stored OAuth tokens (GitHub/GitLab)

## File Structure
```
docs/                 # Knowledge artifacts (decisions, facts, guardrails, procedures, plans)
.github/
  workflows/          # CI/CD (ci.yml, git-poll.yml) - runs on PUBLIC cover repo
.cursorrules         # Cursor IDE rules
apps/
  api/                # Fastify backend
    src/
      routes/         # API routes by resource
      middleware/     # auth, error-handler, request-logger
      lib/            # prisma client, etc.
  web/                # React frontend
    src/
      components/     # Reusable UI components
      pages/          # Route components
      hooks/          # Custom hooks (useAuthStore, etc.)
      lib/            # axios instance, utils
      styles/         # Tailwind + global CSS
packages/
  shared/             # Shared types, utils, config, Prisma schema
    src/
      types/          # Zod schemas + TypeScript types
      utils/          # Pure utility functions
      config/         # Environment validation
    prisma/
      schema.prisma   # Database schema
```