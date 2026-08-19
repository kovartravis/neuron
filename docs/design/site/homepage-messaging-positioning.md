# Homepage messaging & positioning

**Date:** 2026-08-19
**Ticket:** 2 — Homepage Messaging & Positioning (Map — neuron.github.io Site (2.5.0))
**Status:** settled, grilled live with the maintainer. Feeds Ticket 4
(Homepage Visual & Brand Direction) and Ticket 7 (Build the Homepage).

Source material: `docs/design/site/competitive-landscape-and-positioning.md`
(raw, unvalidated maintainer-submitted review) and
`docs/design/site/dev-tool-marketing-docs-survey.md` (9 verified patterns
from Stripe/Linear/Vercel/Resend/Supabase/Turso).

## Category framing

**"Local-first memory engine for coding agents."** Tightened from the
competitive doc's candidate statement ("Local-First Memory &
Failure-Prevention Engine for Autonomous Coding Agents") to one category
noun — memory engine — with **local-first foregrounded as the throughline**,
not a supporting pillar buried third. Failure-prevention survives as the
Zero-Amnesia Execution pillar below, not as a second noun competing with
"memory engine" for the H1's attention (survey pattern 1: category noun +
audience, no adjectives doing the work).

## Hero copy

- **H1:** "The local-first memory engine for coding agents"
- **Subheadline:** "Not another cloud memory API. Not another bloated rules
  file dumped into every prompt. neuron gives Claude Code, Cursor, and Codex
  persistent memory — 100% local, relevance-gated, and it stops your agent
  from repeating the same mistake twice."

**Competitor-naming policy: name the pattern, not the product.** No direct
reference to Mem0/Zep/Letta or CLAUDE.md/.cursorrules by name anywhere in
hero or supporting copy — contrast the *categories* (cloud SaaS memory
APIs, static rules files) instead. Two reasons: it reads more confident than
a direct callout, and it sidesteps needing to spot-verify a claim about a
specific competitor's exact behavior (the competitive doc's own comparison
table is flagged "not independently verified").

## Section order

Hero → Pillars → Pain-point section → (rest of homepage, Ticket 7's own
scope to fill in).

Pillars lead; the pain-point section follows as reinforcement of what the
pillars already resolved, rather than opening with the problem
Turso-style (survey pattern 8 was considered and explicitly not followed
here — deliberate choice, not an oversight).

## Pillars (in order)

1. **Zero-Cloud Privacy** — local ONNX embeddings + SQLite. No API keys, no
   telemetry, nothing leaves your machine. **Leads the order** on the
   maintainer's explicit instruction to keep local-first foregrounded past
   the hero, not just in the H1.
2. **Zero-Amnesia Execution** — pre-command lookup (`neuron exec` /
   `pre-command` hook) checks memory before every shell command runs, so
   agents stop debugging the same failure twice.
3. **Context Budget Diet** — relevance-gated recall (ADR 0012) injects only
   what's relevant, silent otherwise — no dumping a bloated rules file into
   every prompt.

All three map to real, verifiable capabilities already shipped, not
invented marketing copy.

## Pain-point section

Placed after the pillars. Covers, generically (no product names): the
amnesia tax (repeated debugging across sessions), rule blindness/token
bloat from static files, and memory bit rot (contradictory accumulated
rules with no pruning) — framed as the failure modes the three pillars
above already resolved, not a fresh pitch.

## CTA

- **Primary:** the curl install one-liner —
  `curl -fsSL https://raw.githubusercontent.com/kovartravis/neuron/main/install.sh | sh`
  (standalone binary, no Node.js required — shipped, see README.md).
- **Alongside it, as a toggle/tabs:** the npx alternative for Node.js users,
  matching survey pattern 5 (per-path options over a single forced path).
- **Tertiary:** "View on GitHub" link.

## Architecture-linter CI framing (idea D, greenlit — scoped)

Positioning `neuron scan --check` as a CI/CD architecture-drift check for
teams/leads is **greenlit, homepage-light only** — a single line or small
block, not a dedicated feature section. This does **not** un-defer the
map's existing "Not yet specified" fog item (a future map to deepen
Architecture Scan as a documented product feature) — that stays parked
exactly as the map already has it. Ticket 7 (Build the Homepage) should
treat this as a single mention, not an invitation to write deep Architecture
Scan explainer content.

## Benchmark-proof collateral (idea C, ruled out of scope)

The token-cost comparison + failure-repeat demo from the competitive doc's
actionable ideas is **ruled out of scope for this map** (not deferred/fog —
a conscious scope cut). The doc's own figures were illustrative placeholders,
not measured; producing real numbers is a separate effort if ever pursued,
not a resumption of this ticket or this map.
