---
id: 0012
title: API tsconfig Isolated Modules
type: fact
status: active
tags: [architecture, typescript, api, phase0]
last-verified: 2026-09-05
---

# API tsconfig Isolated Modules

**Configuration Added to `@vivascribe/api/tsconfig.json`:**
- `isolatedModules: true`
- `verbatimModuleSyntax: false`

**Rationale:** `isolatedModules: true` ensures each file can be safely transpiled independently (required for esbuild/vite/swc). `verbatimModuleSyntax: false` allows TypeScript to elide unused imports without `import type` annotations, reducing noise in scaffold code.

**Context:** Added during CI fixing session (commit 353d50d) to resolve TypeScript configuration warnings.