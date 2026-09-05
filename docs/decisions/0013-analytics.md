---
id: 0013
title: Analytics
type: decision
status: active
track: product
tags: [product, analytics, metrics, attribution]
---

# Analytics: Comprehensive

**Context:** Need to measure content ROI and team effectiveness.

**Decision:** Track three metric categories:
1. **Web Analytics:** Page views, time on page, scroll depth, referrers, conversions per published piece (via lightweight script or platform APIs)
2. **Git-to-Content Attribution:** Which commits/PRs/tags generated which content; content produced per repo per week; lag time from event to publish
3. **Team Workflow Metrics:** Drafts generated, review turnaround time, approval rate, publish success rate, scheduled vs manual ratio

**Rationale:**
- Attribution proves git→content value prop
- Workflow metrics identify bottlenecks
- Web analytics close the loop on audience impact

**Implementation:** PostHog or custom events; dashboards per org/project; exportable CSV.