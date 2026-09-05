---
id: 0006
title: AI Content Generation
type: decision
status: active
track: process
tags: [architecture, ai, llm, generation]
---

# AI Generation: Free LLM SaaS First

**Context:** Need reliable, high-quality content generation at $0/month infrastructure cost.

**Decision:** Use free LLM SaaS tiers as primary generation engine with automatic fallback chain.
- **Primary:** GitHub Models (GitHub Copilot/Extensions free tier) — GPT-4o, GPT-4o-mini, Llama 3.1
- **Secondary:** OpenRouter free tier — Llama-3.1-8B, Gemma-2-9B, Phi-3, Nemotron-3-Ultra free
- **Tertiary:** NVIDIA NIM free tier — Nemotron 3 Ultra, Nemotron 4 Ultra
- **Quaternary:** Google AI Studio free tier — Gemini 1.5 Flash/Pro
- **Last Resort:** Paid APIs (OpenAI, Anthropic) — only when all free tiers exhausted

**Implementation:**
- Provider abstraction with health checks + automatic failover
- Prompt optimization for smaller/free models (few-shot, structured JSON output)
- Per-content-type model selection (preview=small, articles=large)
- Aggressive caching (24h TTL for same git event + prompt version)
- Token/cost tracking per provider per content type

**Rationale:**
- Guardrail: Zero infra cost (Guardrail: zero-infra-cost)
- Free tiers sufficient for preview + moderate production volume
- Easy to swap models as better free options emerge
- No GPU infra to manage

**Alternatives Considered:**
- Paid APIs primary: rejected — violates zero-infra-cost guardrail
- Self-hosted models: rejected — infra burden, quality variance, not free

**Cost Control:** $0/month target; paid APIs only for production overflow > free tier capacity.