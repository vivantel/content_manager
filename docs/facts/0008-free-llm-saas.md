---
id: 0008
title: Free LLM SaaS Utilization
type: fact
status: active
tags: [architecture, ai, llm, cost-optimization, saas]
---

# Free LLM SaaS Utilization

**Primary Providers (in fallback order):**

1. **GitHub Models (GitHub Copilot/Extensions)**
   - Free with GitHub account
   - Models: GPT-4o, GPT-4o-mini, Llama 3.1, Phi-3, etc.
   - Access: GitHub Models API via GitHub App installation token
   - Rate limits: Generous for free tier

2. **OpenRouter Free Tier**
   - Free models: `meta-llama/llama-3.1-8b-instruct:free`, `google/gemma-2-9b-it:free`, `microsoft/phi-3-mini-128k-instruct:free`, `nvidia/nemotron-3-ultra:free`
   - Access: OpenRouter API key (free tier: 50 req/day per model)
   - Rate limits: Per-model daily caps

3. **NVIDIA NIM (NVIDIA Inference Microservices)**
   - Free tier: Nemotron 3 Ultra, Nemotron 4 Ultra, Llama 3.1 Nemotron
   - Access: NVIDIA API key (developer program)
   - Rate limits: Developer tier limits

4. **Google AI Studio (Gemini)**
   - Free tier: Gemini 1.5 Flash, 1.5 Pro (limited)
   - Access: Google AI Studio API key

**Fallback Chain (Decision 0006 updated):**
```
GitHub Models → OpenRouter free → NVIDIA NIM free → Google AI Studio free → Paid APIs (last resort)
```

**Implementation:**
- Provider abstraction with health checks + automatic failover
- Token/cost tracking per provider per content type
- Prompt optimization for smaller/free models (few-shot, structured output)
- Cache generated content aggressively (24h TTL for same git event)
- Budget: $0/month target; paid APIs only for production overflow > free tier capacity

**Model Selection per Task:**
- **Preview generation:** Smallest free model (Phi-3, Gemma-2-9B)
- **Release notes:** GPT-4o-mini / Llama-3.1-8B
- **Technical articles:** GPT-4o / Nemotron 3 Ultra
- **Social posts:** Small model + template