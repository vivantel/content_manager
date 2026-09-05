---
id: 0007
title: AI-Driven Development Methodology
type: fact
status: active
tags: [process, development, ai, methodology]
---

# AI-Driven Development Methodology

**Primary Development Mode:** AI-assisted coding as default for all implementation work.

**Tooling:**
- **Primary IDE:** Cursor (Composer, Chat, Tab completion)
- **GitHub Copilot:** Chat, Inline, PR summaries, Code review
- **CLI:** Kilo for task automation, context management
- **PR Reviews:** AI-first review (Copilot/Claude) before human review

**Workflow:**
1. **Spec → Code:** Write detailed specs (decisions, procedures) → AI generates implementation
2. **Test-Driven:** AI writes tests first (Vitest, Playwright) → AI implements to pass
3. **Refactor:** AI handles boilerplate, migrations, type updates, dependency upgrades
4. **Documentation:** AI generates docs from code + decisions (OpenAPI, README, changelog)
5. **Debugging:** AI analyzes logs, traces, suggests fixes

**Human Gates (AI proposes, human approves):**
- Architecture decisions (this roadmap process)
- Security-relevant code (auth, RLS, secrets)
- Database migrations
- External API contracts
- Release merges

**Velocity Target:** 3-5x baseline for boilerplate/integration work; 1.5-2x for novel logic.

**Knowledge Capture:** All AI-generated code must be traceable to a decision/fact/guardrail. Update artifacts when implementation diverges.