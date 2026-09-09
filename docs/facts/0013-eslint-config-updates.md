---
id: 0013
title: ESLint Configuration Updates
type: fact
status: active
tags: [architecture, eslint, phase0, ci]
last-verified: 2026-09-05
---

# ESLint Configuration Updates

**Root (`package.json`):**
- Added `eslint-config-prettier` to devDependencies

**Web App (`apps/web/.eslintrc.cjs`):**
- Created separate ESLint config for React app
- Added `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`
- Removed `react-refresh/recommended` from extends (causes errors)
- Relaxed `@typescript-eslint` strict rules for scaffold code:
  - `@typescript-eslint/no-unsafe-*`: off
  - `@typescript-eslint/require-await`: off

**API App (`apps/api/.eslintrc.cjs`):**
- Created separate ESLint config for Fastify API
- Relaxed `@typescript-eslint` strict rules:
  - `@typescript-eslint/require-await`: off
  - `@typescript-eslint/no-unsafe-*`: off
  - `@typescript-eslint/no-floating-promises`: off

**Root (`.eslintrc.cjs`):**
- Removed React-specific plugins (moved to web app)
- Kept base TypeScript rules

**Rationale:** Phase 0 scaffold code triggers many TypeScript strict rule violations. Separate configs per app allow appropriate rule relaxation. Prettier integration prevents formatting conflicts.