# 10 — High-Importance (4–5) Scope Lock in Maintenance

**What to build:** Updates `maintain({ autoPromote: true })` and `checkAutoPromotions()` so that learnings with `importance >= 4` or `is_manual_scope === 1` are locked against automated scope demotion (`global` -> `project` or `project` -> local). They remain in their promoted scope regardless of 30-day query access count.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] `maintain({ autoPromote: true })` checks `importance >= 4` alongside `is_manual_scope === 1`.
- [x] Learnings with `importance >= 4` are exempt from scope demotion.
- [x] High-importance learnings can still be promoted if query access frequency is high (`matchCount >= 15`).
