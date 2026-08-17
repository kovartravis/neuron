# Category: tickets-present

---
id: 5d4082cf-aee3-4319-818d-9e13669901f5
createdAt: 2026-08-16T18:57:38.281Z
importance: 4
tags:
  - planning
  - setup
  - rc2
taskId: null
kind: map
status: unclaimed
---
# Map — MCP Server & Setup/Onboarding Skill Split

## Destination

A shipped MCP server (`npx @kovartravis/neuron mcp`, thin wrapper over
existing CLI command handlers, built on the official
`@modelcontextprotocol/sdk`) giving neuron cross-editor reach beyond the
harness-adapter hook model — alongside a restructured onboarding
experience: a new first-time-setup skill that onboards a fresh repo
(including detecting and offering to migrate existing
CLAUDE.md/.cursorrules/AGENTS.md content), replacing the setup
responsibilities currently bundled into the `neuron-memory` skill, which
narrows to just ongoing maintenance, help, and cleanup.

Reached when: the MCP server ships and is documented for cross-editor
config; a new first-time-setup skill exists, is wired into the first-run
experience, and owns onboarding migration; and `neuron-memory`'s
SKILL.md no longer contains initial-setup interview content (only the
ongoing operate loop).

**Sequenced to land before Map — neuron.github.io Site (2.5.0)**, whose
Ticket 2 — Homepage Messaging & Positioning is blocked on this map's two
terminal tickets: the positioning strategy that chartered this map leans
on MCP/cross-editor support as a differentiator, so the site's messaging
needs this map's outcome to reference truthfully rather than promise
something unshipped.

## Notes

- **Prepared 2026-08-15**, chartered at the maintainer's request following
  a pasted growth/positioning-strategy review (competitive landscape,
  developer pain points, positioning statement, and a set of "actionable
  ideas to drive adoption"). Two of those ideas — an MCP server and an
  onboarding-migration flow — were judged to be real product engineering
  rather than site content, so they graduated into this standalone map
  instead of being filed as children of the site map.
- **This map carries execution**, per the wayfinder skill's own override
  clause — same posture as the site map. The destination is shipped
  surface, not just a spec.
- **Settled during chartering** (pre-ticket scoping calls, not tickets):
  - **MCP tool surface**: thin wrappers over existing CLI command
    handlers (recall, `memory add`/`query`, pre-command lookup) — one
    behavior, two entry points, no logic duplication or drift between the
    CLI and MCP paths.
  - **MCP dependency**: use the official `@modelcontextprotocol/sdk`,
    not a hand-rolled stdio/JSON-RPC implementation — a new, load-bearing
    dependency (protocol correctness), not a convenience wrapper.
  - **Onboarding migration reframed mid-charter**: not a flag bolted onto
    `neuron init`, but a genuine skill split. Pull initial-setup content
    (interview protocol, `neuron.yaml` generation, `AGENTS.md` sync, the
    write-side-enrichment and determinism/`strict`-mode interviews —
    `neuron-memory`'s SKILL.md §0/§0a/§0b, plus the initial-config half
    of §7) out of `neuron-memory` into a new first-time-setup skill.
    `neuron-memory` narrows to §1-6/8's ongoing operate loop (context
    loading, pre-command lookup, failure capture, end-of-run recording,
    md sync, periodic maintenance/pruning, drift protocol) plus whatever
    "help" scope Ticket 3 below sharpens.
  - **Cross-map blocking**: Map — neuron.github.io Site (2.5.0)'s Ticket 2
    (`96a9be90-1b56-4a78-9162-e9584f706877`) has this map's Ticket 4
    (MCP server shipped) and Ticket 6 (skill split complete) added to its
    own `blockedBy`.
- **Non-goals**:
  - No replacement of the existing deterministic hook model for Claude
    Code/Codex CLI — MCP is an additive path for editors without a
    per-turn hook point (Cursor, Windsurf, Zed, Claude Desktop, Roo Code),
    not a migration away from hooks where they already work (ADR 0014).
  - No general-purpose rule-file-format sniffer — onboarding migration is
    scoped to the file shapes neuron's harness adapters already recognize
    (CLAUDE.md/.cursorrules/AGENTS.md-style prose), not arbitrary formats.
  - No change to the underlying memory store, schema, or storage adapters
    — this map is agent-facing surface (a new protocol server, a skill
    split), not storage engineering.
- **Skills to consult**: `/domain-modeling` for the setup/maintenance
  skill boundary (Ticket 3) — this is exactly the kind of term-sharpening
  work the skill exists for. `/grilling` for the MCP tool-surface
  specifics (Ticket 1) and onboarding-migration UX (Ticket 2).


- **Sequencing revised 2026-08-16**: the maintainer chartered Map — SEO &
  GEO Groundwork and asked for it to run **before** this map's own work —
  no prior SEO/GEO experience, so that map lays the domain out first. No
  technical dependency between the two (SEO/GEO groundwork and MCP/setup
  engineering are orthogonal); this is a stated priority order, not a wired
  `blockedBy` edge — claim this map's tickets whenever ready regardless of
  the SEO map's own progress.

## Decisions so far

## Not yet specified

- **Whether MCP server auth/scoping needs anything beyond "local process,
  full store access."** Every current CLI invocation already has that
  same access running as the local user, so a same-machine MCP server
  arguably needs no additional gate — but this hasn't been checked against
  how MCP clients typically sandbox tool permissions. Not sharp enough to
  ticket until Ticket 1's design pass gets there.
- **Whether the first-time-setup skill also absorbs `neuron scan`'s
  initial configuration** (currently split across `neuron-memory"'s §7
  and `neuron init`) — likely, but Ticket 3 decides the exact boundary
  rather than assuming it here.

## Out of scope

- **Homepage/marketing content for MCP or onboarding** — that's Map —
  neuron.github.io Site (2.5.0)'s Ticket 2, which reads *from* this map's
  outcome rather than duplicating it.
- **A new GitHub org, custom domain, or distribution channel beyond MCP
  itself** — not raised during chartering, not this map's concern.

---
id: 943650ce-f12c-47f6-9c61-63f79305d055
createdAt: 2026-08-16T18:57:38.551Z
importance: 4
tags:
  - planning
  - setup
  - publish
taskId: null
kind: map
status: unclaimed
---
# Map — neuron.github.io Site (2.5.0)

## Destination

A live, published dev-tool site at `kovartravis.github.io/neuron` — Astro +
Starlight, in this repo — with a SaaS-quality homepage that sells neuron to
developers evaluating it for their own agentic coding setups, and dev docs
(usage + a curated architecture overview, not raw ADR dumps) accurate to the
current release. Reached when the site is live at that URL *and* a
docs-review step exists in the release process, so the docs don't start
rotting the moment 2.5.0 ships.

## Notes

- **Prepared 2026-08-15**, chartered at the maintainer's direct request to
  give neuron a public face ahead of 2.5.0.
- **Settled during chartering** (pre-ticket scoping calls, not tickets):
  - **Site location**: `kovartravis.github.io/neuron`, a GitHub Pages
    *project* page served from this repo. No org named `neuron` exists
    (repo is `kovartravis/neuron`), so a literal org-level page isn't
    available; a custom domain was considered and declined. Repo is already
    public, MIT-licensed (confirmed via `gh repo view`).
  - **Stack**: Astro + Starlight — plain Astro pages for a fully custom
    homepage, Starlight for docs nav/search/structure.
  - **Audience**: developers evaluating neuron for adoption, not a
    portfolio piece — the homepage needs a real value prop and a working
    quickstart, not just a showcase.
  - **Docs depth**: user-facing usage (install, CLI reference,
    configuration, harness adapters, wayfinder) plus a curated "How It
    Works" layer (hybrid search/RRF, write-side enrichment, declared field
    schema, storage adapters). No raw ADR link-dump — `CONTEXT.md`'s
    glossary is the primary source, not `docs/adr/` directly.
  - **Versioning**: docs track latest only. No versioned doc snapshots.
  - **Reference pages**: CLI/config reference is hand-written and reviewed
    per release, not generated from source — a generated approach would
    better guarantee sync but was explicitly declined in favor of manual
    review.
  - **Sync enforcement**: a manual checklist item in the existing release
    process (mirrors the CHANGELOG/version-bump discipline already there),
    not a CI gate. See ticket 10.
- **Skills to consult**: `/prototype` for the homepage's visual direction
  (ticket 4); `/grilling` and `/domain-modeling` for messaging (ticket 2)
  and docs IA (ticket 3) — pull vocabulary from `CONTEXT.md` rather than
  inventing marketing language that drifts from what the tool does.
- **This map carries execution**, per the wayfinder skill's own override
  clause — the destination is a live site, not a spec, so build/deploy
  tickets (5-9) are in scope alongside the decision tickets.
- **Cross-map dependency, added 2026-08-15**: Ticket 2 (Homepage Messaging
  & Positioning) is now blocked on Map — MCP Server & Setup/Onboarding
  Skill Split's Tickets 4 and 6. A maintainer-submitted positioning-
  strategy review (competitive landscape, developer pain points, a
  candidate positioning statement) arrived as input to this map's Ticket 2
  — but two of its "actionable ideas" (an MCP server, an onboarding-
  migration flow) turned out to be real product engineering rather than
  site content, and graduated into that standalone map instead. Ticket 2
  waits so messaging doesn't promise either feature before it ships. Full
  analysis linked from Ticket 2's own content:
  `docs/design/site/competitive-landscape-and-positioning.md`.


- **Map — SEO & GEO Groundwork chartered 2026-08-16** (id `64cc32f8-4b9b-48dd-b18c-ca0788b96cba`),
  sequenced by the maintainer to run before this map's homepage-build work.
  Real cross-map wiring: its Ticket 2 blocks this map's Ticket 3 (Docs IA);
  its Ticket 3 blocks this map's Ticket 7 (Build the Homepage); its Ticket 6
  blocks this map's Ticket 2 (Homepage Messaging), alongside the existing
  MCP-server blockers. This map's own Ticket 5 (Scaffold Astro+Starlight)
  in turn unblocks that map's Ticket 4 (Sitemap/Robots.txt setup).

## Decisions so far

## Not yet specified

- **Whether the homepage needs a live/interactive demo** (e.g. an
  asciinema-style terminal recording) — likely surfaces once ticket 4's
  prototype session has something concrete to react to; not sharp enough
  to ticket yet.
- **Analytics/telemetry for the live site** — low priority, not worth
  pinning down before the site exists to put it on.
- **Distribution channels** (README badge linking to the site, any tool
  directory submissions) — deliberately out of scope for Map — SEO & GEO
  Groundwork (id `64cc32f8-4b9b-48dd-b18c-ca0788b96cba`), which owns the technical/on-site half of
  this fog item instead. Still fog here until that map's foundation ships
  and there's a site worth badging/submitting.

## Out of scope

- **Custom domain** — `kovartravis.github.io/neuron` chosen instead;
  revisiting this would be a fresh scoping decision, not a resumption of
  this map.
- **A new GitHub org named `neuron`** — same reasoning; the project-page
  URL was chosen over standing up new org infrastructure.
- **Versioned docs per release** — latest-only chosen; if release cadence
  later demands version-pinned docs, that's a new effort.
- **Generating reference docs from source** — considered, declined in
  favor of hand-written pages reviewed per release.

---
id: 0c51a772-ff20-4d78-89dd-49a018b01b55
createdAt: 2026-08-16T18:57:40.774Z
importance: 4
tags:
  - rc2
  - wayfinder
  - setup
taskId: null
blockedBy: a773beec-dc7d-4da7-afe1-424a5b341fb1,33bc46e8-c074-4275-a20b-7494d2a2a35e
kind: task
map: 5d4082cf-aee3-4319-818d-9e13669901f5
status: unclaimed
---
# 6 — Trim `neuron-memory` SKILL.md to Maintenance/Help/Cleanup Scope

## Question

Remove the initial-setup content from `.claude/skills/neuron-memory/SKILL.md`
per Ticket 3's boundary, leaving it scoped to ongoing maintenance, help,
and cleanup.

## Context

Graduated from Ticket 3's design and blocked on Ticket 5 shipping first —
don't leave a gap where neither skill covers initial setup. Ticket 3 owns
the exact boundary (which sections move, how §7 splits between setup-
config and scan-execution/drift); this ticket executes that removal and
implements whatever "help" scope Ticket 3 pins down.

## Deliverables

- [ ] §0/§0a/§0b and the setup-config half of §7 removed from
      `neuron-memory`'s SKILL.md per Ticket 3's exact boundary
- [ ] The skill's frontmatter `description` updated to match its
      narrowed scope (currently: "Manage agent session context by
      interviewing the user, configuring neuron.yaml, loading learnings,
      recording history, and pruning obsolete entries" — the
      "interviewing the user, configuring neuron.yaml" clause no longer
      applies once setup moves out)
- [ ] Ticket 3's "help" scope implemented, not just documented as a word
- [ ] A pointer from `neuron-memory` to the new first-time-setup skill
      for the content that moved (so an agent that lands here first for a
      brand-new repo isn't stranded)
- [ ] `npm test` and `tsc` clean
- [ ] This ticket + Ticket 4 unblock Map — neuron.github.io Site
      (2.5.0)'s Ticket 2 (Homepage Messaging & Positioning)

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Created while chartering Map — MCP Server & Setup/Onboarding
  Skill Split. Blocked on Tickets 3 and 5. Alongside Ticket 4, unblocks
  Map — neuron.github.io Site (2.5.0)'s Ticket 2.

---
id: 33bc46e8-c074-4275-a20b-7494d2a2a35e
createdAt: 2026-08-16T18:57:40.865Z
importance: 4
tags:
  - planning
  - setup
  - rc2
taskId: null
blockedBy: 4d49418c-4b64-4008-ba9e-3500ebb970c1,a773beec-dc7d-4da7-afe1-424a5b341fb1
kind: task
map: 5d4082cf-aee3-4319-818d-9e13669901f5
status: unclaimed
---
# 5 — Implement First-Time-Setup Skill

## Question

Build the new first-time-setup skill: the initial-setup content Ticket 3
identifies as moving out of `neuron-memory`, plus the onboarding-migration
behavior Ticket 2 designs, combined into one skill that runs when a repo
first sets up neuron.

## Context

Graduated from Tickets 2 and 3's design work. Do not start from scratch —
Ticket 3 owns the exact section boundary (what moves from
`neuron-memory`'s SKILL.md §0/§0a/§0b and part of §7), Ticket 2 owns the
onboarding-migration behavior. This ticket assembles both into one
coherent skill file and wires it into the first-run experience (likely
triggered from `neuron init`, or a dedicated slash command — confirm
against Ticket 3's resolution, which may settle this).

## Deliverables

- [ ] New skill file (name/location per Ticket 3's resolution, e.g.
      `.claude/skills/neuron-setup/SKILL.md`) containing the moved
      setup content from Tickets 2 and 3
- [ ] Wired into the first-run flow (confirm trigger mechanism against
      Ticket 3's resolution)
- [ ] Onboarding-migration behavior implemented per Ticket 2's resolution
- [ ] Cross-references between this skill and the trimmed
      `neuron-memory` (Ticket 6) are correct in both directions — a
      reader landing in either skill can find the other for what it no
      longer covers
- [ ] `npm test` and `tsc` clean (to the extent skill files are covered
      by the test suite at all — confirm)

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Created while chartering Map — MCP Server & Setup/Onboarding
  Skill Split. Blocked on Tickets 2 and 3. Blocks Ticket 6 (Ticket 6
  shouldn't trim `neuron-memory`'s setup content until the replacement
  skill actually exists and covers it).

---
id: fada539c-31ee-4a3a-9f4a-2b3fe86165b4
createdAt: 2026-08-16T18:57:40.952Z
importance: 4
tags:
  - planning
  - setup
  - 2.2.0
taskId: null
blockedBy: c338bfbb-40e9-420d-8a54-8d06e2fc2a3f
kind: task
map: 5d4082cf-aee3-4319-818d-9e13669901f5
status: unclaimed
---
# 4 — Implement MCP Server

## Question

Build `neuron mcp`: an MCP server exposing the tool surface Ticket 1
designs, built on `@modelcontextprotocol/sdk`, wrapping existing CLI
command handlers rather than reimplementing their logic.

## Context

Graduated from Ticket 1's design. Do not start from scratch here — Ticket
1 owns the tool list, schemas, packaging decision, and auth/scoping
answer; this ticket implements exactly that.

## Deliverables

- [ ] `@modelcontextprotocol/sdk` added as a dependency
- [ ] MCP server implementing Ticket 1's tool surface, each tool calling
      straight into the existing handler it wraps (no parallel logic path)
- [ ] Packaging per Ticket 1's decision (subcommand vs. separate entry
      point)
- [ ] README/docs snippet showing the client-side `mcpServers` config
      (or confirm this was already scoped into Ticket 1/this ticket vs.
      deferred — check Ticket 1's resolution)
- [ ] `npm test` and `tsc` clean
- [ ] This ticket + Ticket 6 unblock Map — neuron.github.io Site
      (2.5.0)'s Ticket 2 (Homepage Messaging & Positioning) — confirm
      that blocking edge still makes sense once this ships, don't just
      assume it

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Created while chartering Map — MCP Server & Setup/Onboarding
  Skill Split. Blocked on Ticket 1. Alongside Ticket 6, unblocks Map —
  neuron.github.io Site (2.5.0)'s Ticket 2.

---
id: a773beec-dc7d-4da7-afe1-424a5b341fb1
createdAt: 2026-08-16T18:57:41.029Z
importance: 4
tags:
  - setup
  - planning
  - skill
taskId: null
kind: grilling
map: 5d4082cf-aee3-4319-818d-9e13669901f5
status: unclaimed
---
# 3 — Design the Setup/Maintenance Skill Boundary (`neuron-memory` Split)

## Question

Exactly what moves out of `neuron-memory`'s SKILL.md into the new
first-time-setup skill, what stays, and what does "sharpen neuron-memory
for maintenance, help, and cleanup" mean concretely — particularly the
"help" part, which isn't a section that exists in the skill today?

## Context

Direct inspection of `.claude/skills/neuron-memory/SKILL.md` (556 lines)
during this map's chartering found a real, pre-existing seam:

- **Setup-shaped** (candidates to move): §0 Initial Project Setup &
  Interview Protocol (the ask-first interview, `neuron.yaml` generation,
  `AGENTS.md` sync), §0a Write-Side Enrichment Interview, §0b
  Determinism/`strict`-mode interview, and the initial-config half of §7
  (Architectural Scan & Configuration Protocol's "ask & explain options,
  update config" steps).
- **Operate-loop-shaped** (candidates to keep): §1 Beginning-of-Run
  context loading, §2 Pre-Command Lookup, §3 Closed-Loop Failure Feedback,
  §4 End-of-Run recording, §5 Markdown Storage & Sync, §6 Periodic
  Maintenance (review/prune), §7's scan-*execution*/drift-reading steps,
  §8 Architectural Drift Protocol.

That split isn't perfectly clean — §7 currently interleaves initial scan
*configuration* (setup-shaped) with scan *execution* and drift reading
(operate-loop-shaped) in one numbered section, so this ticket needs to
decide how §7 itself gets divided, not just move whole sections wholesale.

"Help" is the genuinely open word: the maintainer's instruction named
three purposes for the narrowed skill — maintenance, help, cleanup — but
only maintenance/cleanup map onto existing content (§6's review-and-prune
loop). What "help" is supposed to add (in-session troubleshooting
guidance? a pointer to `neuron --help`/docs? something new?) needs to be
pinned down, not inferred.

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Created while chartering Map — MCP Server & Setup/Onboarding
  Skill Split, directly from the maintainer's own reframing of the
  onboarding-migration idea into a skill split. Blocks Ticket 5
  (implementation of the new skill) and Ticket 6 (trimming
  `neuron-memory`).

---
id: 4d49418c-4b64-4008-ba9e-3500ebb970c1
createdAt: 2026-08-16T18:57:41.121Z
importance: 4
tags:
  - adr
  - setup
  - planning
taskId: null
kind: grilling
map: 5d4082cf-aee3-4319-818d-9e13669901f5
status: unclaimed
---
# 2 — Design Onboarding-Migration Behavior for the New First-Time-Setup Skill

## Question

When the new first-time-setup skill detects an existing
CLAUDE.md/.cursorrules/AGENTS.md in a repo being onboarded, what does it
actually do with that content?

## Context

Raised, then reframed, during this map's chartering: the original growth-
strategy review's idea B ("detect and offer to import") was folded into a
bigger move — a dedicated first-time-setup skill rather than a flag on
`neuron init` — but the actual migration behavior inside that skill was
never pinned down. Two shapes were on the table before the reframe and are
still live options:

- **LLM-parse into structured memory entries**: run the existing
  summarizer LLM over the prose file, split it into discrete
  category-tagged entries, write them via the normal `memory add` path.
  Real value (relevance-gated recall vs. a flat prose dump into every
  prompt) but real risk (misclassification, silent loss of nuance in the
  parse, and the file being actively maintained prose the user still
  wants to read — is it deleted, kept, or left as a fallback for harnesses
  without a hook?).
- **Lightweight: detect and flag only**. The skill tells the user it
  found the file and describes what neuron would do differently, but
  doesn't attempt automated parsing — the user decides. Lower risk, lower
  payoff, much less engineering.

This ticket decides which (or what hybrid), and specifies the detection
scope: per this map's own non-goals, limited to the file shapes neuron's
harness adapters already recognize, not an open-ended format sniffer.

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Created while chartering Map — MCP Server & Setup/Onboarding
  Skill Split. Supersedes the original growth-strategy review's idea B
  framing (a simple import flag) once the skill-split reframe happened.
  Blocks Ticket 5 (implementation), alongside Ticket 3.

---
id: c338bfbb-40e9-420d-8a54-8d06e2fc2a3f
createdAt: 2026-08-16T18:57:41.207Z
importance: 4
tags:
  - setup
  - planning
  - 2.2.0
taskId: null
kind: grilling
map: 5d4082cf-aee3-4319-818d-9e13669901f5
status: unclaimed
---
# 1 — Design MCP Tool Surface & Packaging

## Question

What exact tools does the MCP server expose, what does each map to in the
existing codebase, and how is the server packaged/invoked?

## Context

Settled during the map's own chartering: tools are thin wrappers over
existing CLI command handlers (recall, `memory add`/`query`, pre-command
lookup) — reuse, not reimplementation — built on the official
`@modelcontextprotocol/sdk`. What's still open for this ticket:

- Exact tool list and schemas. The originating growth-strategy review
  named `neuron_remember`, `neuron_recall`, `neuron_query_exec` as
  illustrative examples, not a spec — confirm the final set and each
  tool's input/output shape against what `handleMemoryCommand` /
  `resolveExecCategories`+`queryGated` (`src/commands/exec.ts`) actually
  accept and return.
- Packaging: a `neuron mcp` subcommand (spawned by the MCP client per the
  standard stdio transport) vs. a separate entry point/binary.
  `neuron init` should plausibly offer to write the client-side
  `mcpServers` config stanza — decide whether that's in this ticket's
  scope or a follow-on.
- Auth/scoping: the map's own "Not yet specified" flags this as open —
  does a local-process MCP server need anything beyond the access every
  CLI invocation already has running as the local user? Check how MCP
  clients typically sandbox tool permissions before assuming "none
  needed."
- Relationship to the existing harness-adapter model (ADR 0014): MCP is
  additive for editors with no per-turn hook point (Cursor, Windsurf, Zed,
  Claude Desktop, Roo Code) — confirm this ticket's design doesn't
  quietly start overlapping with or duplicating the deterministic-hook
  path for Claude Code/Codex CLI, which stays on hooks.

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Created while chartering Map — MCP Server & Setup/Onboarding
  Skill Split, itself spun out of a maintainer-submitted growth/
  positioning-strategy review. Blocks Ticket 4 (implementation).

---
id: f075521d-16fc-4873-a27c-0e96eb73727e
createdAt: 2026-08-16T18:57:42.710Z
importance: 4
tags:
  - release
  - git
  - failure-fix
taskId: null
kind: task
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 10 — Add a Docs-Review Step to the Release Checklist

## Question

Add a "docs reviewed against this release's CLI/config surface" checklist item to wherever this repo's release process is already documented (mirrors the discipline already given to CHANGELOG/version-bump steps), so the manual sync the maintainer chose (over a CI gate) has a real home instead of living only in this map's Notes.

## Context

Independent of every other ticket — editing process documentation, not building anything. First needs to locate where the release checklist actually lives in this repo.

---
id: 61c267a2-de42-4fae-a581-7435c0f4e9f7
createdAt: 2026-08-16T18:57:42.771Z
importance: 4
tags:
  - config
  - memory
  - setup
taskId: null
blockedBy: ee1b0d6f-783a-4dc5-95f9-dc39d6828910,2cfb58c4-305e-414f-b40d-f2d4e46ad016
kind: task
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 9 — Write CLI & Config Reference Pages

## Question

Write hand-authored reference pages for every CLI command and every neuron.yaml declared field/config option, accurate to the current (2.4.x) surface.

## Context

Kept separate from ticket 8 because reference pages need exhaustive accuracy against the actual CLI surface (neuron <cmd> --help, neuronYaml.ts), not prose — a different kind of writing task.

---
id: ab00735c-765e-4575-aa0d-4bacaaa0cd1c
createdAt: 2026-08-16T18:57:42.829Z
importance: 4
tags:
  - adr
  - md-storage
  - enrichment
taskId: null
blockedBy: ee1b0d6f-783a-4dc5-95f9-dc39d6828910,2cfb58c4-305e-414f-b40d-f2d4e46ad016
kind: task
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 8 — Write Docs Content Pages

## Question

Write the docs content (Starlight markdown pages) for every section ticket 3's IA settles, sourced primarily from CONTEXT.md's glossary and the relevant ADRs for the "How It Works" layer.

## Context

May need to graduate into further per-section tickets once ticket 3 resolves and the real page count is known — expected, not a planning failure.

---
id: 531c631b-cf9b-4a6b-be27-b3fa5529a202
createdAt: 2026-08-16T18:57:42.911Z
importance: 4
tags:
  - planning
  - release
  - wayfinder
taskId: null
blockedBy: 96a9be90-1b56-4a78-9162-e9584f706877,19f204e7-ed0c-4883-8a86-9416bb257c02,2cfb58c4-305e-414f-b40d-f2d4e46ad016,3e0edd28-4651-4fc8-897f-5f44dad8b294
kind: task
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 7 — Build the Homepage

## Question

Implement the homepage in Astro against ticket 2's settled messaging and ticket 4's resolved visual direction.

## Context

Blocked on both decision tickets plus the scaffold (ticket 5) existing to build into.

---
id: b7e4dab5-5b0f-44e9-bcb8-0c8475ed785c
createdAt: 2026-08-16T18:57:42.968Z
importance: 4
tags:
  - git
  - release
  - publish
taskId: null
blockedBy: 2cfb58c4-305e-414f-b40d-f2d4e46ad016
kind: task
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 6 — GitHub Pages Deploy Pipeline

## Question

Wire a GitHub Actions workflow that builds the Astro site and deploys it to GitHub Pages on merge to main (or on release), and enable Pages in the repo settings pointed at that deployment. Confirm the live URL actually resolves to kovartravis.github.io/neuron.

## Context

Needs a real build to deploy against, hence blocked on ticket 5's scaffold. Try gh api / gh CLI for the Pages settings step before assuming it needs manual GitHub UI action.

---
id: 2cfb58c4-305e-414f-b40d-f2d4e46ad016
createdAt: 2026-08-16T18:57:43.029Z
importance: 4
tags:
  - publish
  - setup
  - release
taskId: null
kind: task
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 5 — Scaffold Astro + Starlight in This Repo

## Question

Stand up a working Astro + Starlight site (placeholder content) inside this repo, configured for the kovartravis.github.io/neuron project-page base path, with local dev (astro dev) running clean and not colliding with the existing TypeScript/npm build or test pipeline. Decide and document where the site source lives (e.g. /site).

## Context

Purely mechanical — no design or content decision blocks this from starting immediately. AFK-drivable.

---
id: 19f204e7-ed0c-4883-8a86-9416bb257c02
createdAt: 2026-08-16T18:57:43.089Z
importance: 4
tags:
  - planning
  - ui
  - release
taskId: null
blockedBy: ab6103ac-1b08-4ea6-aadd-816a8d5d4e46,96a9be90-1b56-4a78-9162-e9584f706877
kind: prototype
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 4 — Homepage Visual & Brand Direction

## Question

What should the homepage actually look and feel like — layout, color, typography, hero treatment, whether it needs a live/interactive demo? Use /prototype to produce a rough, concrete homepage draft to react to, informed by ticket 1's survey and ticket 2's settled messaging.

## Context

This is where "does the homepage need a live terminal demo" (currently fog on the map's Not yet specified) gets resolved — don't pre-decide it here, let the prototype session surface it.

---
id: ee1b0d6f-783a-4dc5-95f9-dc39d6828910
createdAt: 2026-08-16T18:57:43.151Z
importance: 4
tags:
  - adr
  - 2.2.0
  - rc2
taskId: null
blockedBy: 4b5c1114-812d-4533-a992-7bebb4ca3ec1
kind: grilling
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 3 — Docs Information Architecture

## Question

What pages/sections does the docs half of the site actually have, in what order, under what nav structure — within the "user-facing + architecture overview" depth already scoped on the map (Getting Started, CLI Reference, Configuration, Harness Adapters, Wayfinder, How It Works, anything else)? Resolve the sitemap and each page's scope, not the content itself.

## Context

Feeds ticket 8 (docs content) and ticket 9 (CLI/config reference) — both need a settled structure before writing lands anywhere durable. Can run in parallel with tickets 1/2 — it doesn't depend on messaging or the competitive survey.

---
id: 96a9be90-1b56-4a78-9162-e9584f706877
createdAt: 2026-08-16T18:57:43.213Z
importance: 4
tags:
  - benchmark
  - planning
  - setup
taskId: null
blockedBy: ab6103ac-1b08-4ea6-aadd-816a8d5d4e46,fada539c-31ee-4a3a-9f4a-2b3fe86165b4,0c51a772-ff20-4d78-89dd-49a018b01b55,a3cc1972-e455-4c61-9ec4-bcc873c6353d
kind: grilling
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 2 — Homepage Messaging & Positioning

## Question

What's neuron's actual value prop and headline message for a developer landing on the homepage cold — what does it do, why does it matter over the status quo (plain CLAUDE.md/AGENTS.md prose memory), and what's the call to action? Resolve the headline, the supporting sections' framing, and how (if at all) neuron is positioned against alternatives.

## Context

Feeds ticket 4 (homepage visual prototype) and ticket 7 (homepage build) — a design pass without settled words to design around isn't useful. Use CONTEXT.md's glossary for accurate terminology (hybrid search, harness adapter, wayfinder, etc.) rather than inventing marketing language that drifts from what the tool actually does. Informed by ticket 1's survey.

**Blocked (added 2026-08-15) on Map — MCP Server & Setup/Onboarding Skill
Split's Ticket 4 (MCP server shipped) and Ticket 6 (setup/maintenance
skill split complete).** A maintainer-submitted positioning-strategy
review leans on MCP/cross-editor support as a differentiator — this
ticket shouldn't lock in messaging that promises either before they
actually ship. Full competitive-landscape and positioning analysis from
that review (candidate positioning statement, three-pillar framing,
developer pain points, competitive matrix — none of it independently
verified yet, all of it raw input for this ticket's own grilling session):
`docs/design/site/competitive-landscape-and-positioning.md`.

---
id: ab6103ac-1b08-4ea6-aadd-816a8d5d4e46
createdAt: 2026-08-16T18:57:43.289Z
importance: 4
tags:
  - planning
  - benchmark
  - setup
taskId: null
kind: research
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 1 — Survey Dev-Tool Marketing + Docs Sites for Patterns

## Question

What do best-in-class developer-tool sites (marketing homepage + docs) actually do well that neuron's site should borrow or deliberately avoid — hero-section structure, how they explain a technical value prop, docs IA, code-sample presentation, whether/how they use a live demo? Survey 4-6 real sites (e.g. Stripe, Linear, Vercel, Resend, Supabase, or closer analogues among local-first/dev-tool CLI products) and produce a markdown summary of concrete, reusable patterns — not just impressions — as a linked asset.

## Context

Chartered directly from the "something like a SaaS would have" framing in the original request. Collected once here so ticket 2 (messaging) and ticket 4 (homepage prototype) don't each re-derive inspiration from scratch.

---
id: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
createdAt: 2026-08-17T01:00:19.690Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
kind: map
status: unclaimed
---
# Map — SEO & GEO Groundwork

## Destination

The technical foundation and on-site content conventions that let
`kovartravis.github.io/neuron` (Map — neuron.github.io Site (2.5.0)) get
found by traditional search *and* cited inside AI answer engines (ChatGPT,
Claude, Perplexity, Google AI Overviews) once it ships — structured data,
crawlability, IA/URL conventions, and a content house-style, decided once so
Site (2.5.0) builds against them instead of re-deriving them mid-build.
Reached when every ticket below is resolved and Site (2.5.0)'s IA, homepage,
and content tickets have what they need from this map to proceed.

## Notes

- **Chartered 2026-08-16**, at the maintainer's explicit request, sequenced
  to run **before** both Map — MCP Server & Setup/Onboarding Skill Split and
  Map — neuron.github.io Site (2.5.0)'s homepage-build work. No prior
  SEO/GEO experience on the maintainer's side, so this map exists to lay the
  domain out breadth-first, not just execute an already-known plan.
- **Scope, settled at chartering**: technical + on-site content foundations
  only. Active distribution/outreach (HN/Reddit launch posts, awesome-list
  PRs, directory submissions, backlink campaigns) is explicitly **out of
  scope** — keeps this map finishable instead of an open-ended marketing
  backlog. See Out of scope, below.
- **Crawler policy, settled at chartering (not a ticket)**: allow every
  crawler — AI training crawlers (GPTBot, anthropic-ai, CCBot, etc.) and
  real-time retrieval/search crawlers (OAI-SearchBot, ChatGPT-User,
  ClaudeBot, Claude-SearchBot, PerplexityBot) alike. Maximize AI visibility
  over guarding against training use. Ticket 4 implements this call; it
  isn't this map's own decision to re-litigate.
- Research grounding this map's chartering (2026 general web search, not
  primary-source-verified — re-check before relying on specifics): GEO
  ("Generative Engine Optimization") targets being *quoted inside* an AI
  answer, distinct from classic SEO's rank-and-click; `llms.txt` is real
  but unofficial, cheap to add, uncertain payoff; content with explicit
  limitations/attribution sections is reported to get cited more; "entity
  authority" (third-party mentions, directory listings) is displacing
  backlinks as the trust signal AI engines lean on.
- **This map carries execution**, per the wayfinder skill's own override
  clause, matching Site (2.5.0) and MCP Server's own posture — several
  tickets here (sitemap/robots.txt, llms.txt) are direct implementation,
  not just decisions.
- **Cross-map wiring, added at chartering**: Ticket 2 (IA & Citability
  Conventions) blocks Site (2.5.0)'s Ticket 3 (Docs IA); Ticket 3
  (Structured Data Strategy) blocks Site's Ticket 7 (Build the Homepage);
  Ticket 6 (Content-Authoring Guidelines) blocks Site's Ticket 2 (Homepage
  Messaging), alongside its existing MCP-server blockers. In the other
  direction, this map's own Ticket 4 (Sitemap/Robots.txt/Canonical Setup)
  is blocked by Site's Ticket 5 (Scaffold Astro+Starlight), since it needs
  a real site to generate a sitemap against.

## Decisions so far

- [1 — Keyword & Search-Intent Research](docs/design/seo/keyword-search-intent-research.md) —
  bare category phrases ("claude code memory," "AI agent long-term memory")
  are saturated (Mem0, SEO-farmed roundups); long-tail/comparison/
  alternatives phrasing and CLAUDE.md-pain-point vocabulary (amnesia,
  goldfish, context rot, drift) are open. Closest direct competitor found:
  `gastownhall/beads` (issue tracker + agent memory, graph/Dolt-backed).
  No competitor combines markdown-as-source-of-truth + schema enforcement +
  issue tracker + architecture blueprint — that combination, and
  "architecture linter for AI agents," are open. Feeds Ticket 2 and
  Ticket 6.

## Not yet specified

- Ongoing ranking/citation maintenance cadence once the site is live and
  initial measurement (Ticket 7) is running — how often to re-check, what
  triggers a content refresh. Can't specify until Ticket 7 picks an
  approach and the site has real traffic/citation data to react to.

## Out of scope

- **Active distribution/outreach** — HN/Reddit launch posts, awesome-list
  PRs, directory submissions, backlink campaigns. Ruled out at chartering
  (maintainer's explicit scope call) to keep this map finishable; may
  become its own future effort once the technical/content foundation here
  ships.

---
id: 1cca44ce-a2c7-4bae-9aed-c42b96ab2cee
createdAt: 2026-08-17T01:00:19.924Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
kind: research
map: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
status: resolved
---
# 1 — Keyword & Search-Intent Research

## Question

What do developers actually search for when they'd want a tool like neuron
— around agent/coding-assistant memory, CLAUDE.md/AGENTS.md pain points,
and competing categories (vector-DB memory layers, mem0-style products,
plain markdown context files)? Produce a short findings doc: the real query
phrases, their intent (informational vs. solution-seeking), and which ones
neuron can credibly rank/cite for.

## Context

Grounds every downstream IA, content, and messaging decision in this map
and Site (2.5.0) in actual search behavior rather than guesswork — neither
the maintainer nor this map's own chartering session has direct SEO
experience to draw on otherwise. Feeds Ticket 2 (IA) and Ticket 6
(Content-Authoring Guidelines) directly, and indirectly informs Site
(2.5.0)'s own Ticket 1 (marketing/docs site survey) and Ticket 2 (Homepage
Messaging).

## Answer

Full findings, with sources cited per claim:
`docs/design/seo/keyword-search-intent-research.md`.

**No ranking tool (Ahrefs/SEMrush/GSC) or browser was available**, so this
is qualitative (SERP-population-based), not a measured keyword-volume
study — treat "wide open" / "contested" judgments as directional, and
re-verify with real tooling before spending content-production effort
against any single phrase.

**Query landscape**: bare category phrases ("claude code memory",
"persistent memory for llm agents", "AI agent long-term memory") are
saturated — dominated by Mem0's content marketing, Anthropic's own docs,
and SEO-farmed "best of 2026" roundups (Braintrust, Vectorize, EverMind,
Powerdrill all list the same six tools; neuron is in none of them).
Long-tail and comparison phrases are more winnable: "mem0 alternatives"
pages already exist as their own query intent; "X vs Y" comparison posts
(Vectorize, SourceForge) are a well-established pattern with no neuron
pairing yet; hand-written multi-tool comparison posts (e.g. a Medium
six-way comparison) don't include neuron and are a more realistic near-term
target than organic ranking against Mem0's domain authority.

**CLAUDE.md/AGENTS.md pain points** (verified primary sources): GitHub
issue `anthropics/claude-code#14227` ("It's a goldfish," "amnesia in the
CLI," closed as not-planned by Anthropic), HN thread `#47034087` on the
AGENTS.md effectiveness study ("This file could be renamed CONTRIBUTING.md"),
and claudelint's docs confirming Claude Code warns at 40KB. Real developer
vocabulary to reuse in content: amnesia, goldfish, context rot, drift,
stale, unwieldy. "Context rot" itself is shared vocabulary, not
vendor-owned — open for neuron's relevance-gated injection (ADR 0012) to
answer directly.

**Competing categories** — the field is more crowded than this map's
sibling `docs/design/site/competitive-landscape-and-positioning.md`
suggested: `gastownhall/beads` is the closest direct competitor found
(issue tracker + agent memory, "memory upgrade for your coding agent," but
graph+Dolt-backed rather than plain-markdown); `rohitg00/agentmemory`
claims "#1 persistent memory for AI coding agents"; `hmans/beans` is a
plain-markdown issue tracker. **No competitor found combines
markdown-as-source-of-truth + schema enforcement + issue tracker +
architecture blueprint the way neuron does** — that combination, and the
exact phrase "architecture linter for AI agents" (maps to `neuron scan
--check`), are open on this pass.

**Feeds forward**: Ticket 2 (IA & Citability Conventions) and Ticket 6
(Content-Authoring Guidelines) should prioritize the long-tail/comparison/
alternatives phrasing and the amnesia/context-rot vocabulary over
competing head-on for saturated category terms.

---
id: 4b5c1114-812d-4533-a992-7bebb4ca3ec1
createdAt: 2026-08-17T01:00:19.958Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
blockedBy: 1cca44ce-a2c7-4bae-9aed-c42b96ab2cee
kind: grilling
map: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
status: unclaimed
---
# 2 — Information Architecture & URL/Citability Conventions

## Question

What URL structure, page-chunking, and heading conventions make the site
both crawlable by traditional search engines and easy for an AI answer
engine to lift a self-contained, correctly-attributed quote from? (e.g. one
concept per page vs. long single-page docs, stable/short URLs, heading
hierarchy, whether/how to structure FAQ-style Q&A blocks.)

## Context

This is the conventions layer Site (2.5.0)'s own Ticket 3 (Docs Information
Architecture) needs before it can commit to a real IA — building docs IA
twice (once naively, once GEO-aware) is exactly the rework this map exists
to prevent. Informed by Ticket 1's search-intent findings. Blocks Site
(2.5.0)'s Ticket 3.

---
id: 3e0edd28-4651-4fc8-897f-5f44dad8b294
createdAt: 2026-08-17T01:00:19.991Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
blockedBy: 4b5c1114-812d-4533-a992-7bebb4ca3ec1
kind: grilling
map: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
status: unclaimed
---
# 3 — Structured Data & Schema.org Strategy

## Question

Which JSON-LD schema.org types does the site need (`SoftwareApplication`
for the homepage/product, `TechArticle` or `FAQPage` for docs,
`Organization`/`Person` for attribution) and on which page templates does
each attach?

## Context

Structured data doesn't change what a page says, only how unambiguously a
crawler (search or AI) can parse it — worth deciding once as a
template-level convention rather than ad hoc per page. Feeds Site
(2.5.0)'s Ticket 7 (Build the Homepage), which should implement against
this ticket's decision rather than invent its own markup. Blocks Site
(2.5.0)'s Ticket 7.

---
id: a8719d5c-34a9-4ebe-b1c2-f48408c963df
createdAt: 2026-08-17T01:00:20.021Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
blockedBy: 4b5c1114-812d-4533-a992-7bebb4ca3ec1,2cfb58c4-305e-414f-b40d-f2d4e46ad016
kind: task
map: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
status: unclaimed
---
# 4 — Sitemap, Robots.txt & Canonical URL Setup

## Question

Implement sitemap.xml generation, robots.txt, and canonical tag conventions
for the live site.

## Context

**Crawler policy settled at this map's chartering (not a ticket):** allow
every crawler, including AI training crawlers (GPTBot, anthropic-ai,
CCBot, etc.) alongside real-time retrieval/search crawlers (OAI-SearchBot,
ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot) — maximize
visibility over guarding against training use. This ticket is the
mechanical implementation of that call, not a re-litigation of it. Needs
the Astro+Starlight scaffold in place to generate against (Site (2.5.0)'s
Ticket 5) and this map's Ticket 2's URL/IA conventions so the sitemap
reflects the real structure, not a placeholder.

---
id: 787c805a-69dd-409f-8060-91efa97fa044
createdAt: 2026-08-17T01:00:20.053Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
blockedBy: 4b5c1114-812d-4533-a992-7bebb4ca3ec1
kind: task
map: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
status: unclaimed
---
# 5 — llms.txt / llms-full.txt Decision & Draft

## Question

Should the site publish an `llms.txt` (and/or `llms-full.txt`) at its
root, and if so, what does it curate?

## Context

`llms.txt` is not an official standard as of 2026 — no major LLM provider
has confirmed it crawls the file on a schedule — but it's cheap to add and
directionally aligned with where AI-readiness is heading (a curated,
machine-readable map of the site's key content). Low cost, uncertain
payoff: worth a deliberate yes/no rather than skipping by default or
cargo-culting it in. If yes, draft it against Ticket 2's IA once real URLs
exist.

---
id: a3cc1972-e455-4c61-9ec4-bcc873c6353d
createdAt: 2026-08-17T01:00:20.084Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
blockedBy: 1cca44ce-a2c7-4bae-9aed-c42b96ab2cee
kind: grilling
map: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
status: unclaimed
---
# 6 — Content-Authoring Guidelines for AI Citability

## Question

What house style should every piece of site copy (homepage, docs,
reference pages) follow to be both genuinely useful and more likely to be
quoted by an AI answer engine — e.g. explicit "limitations/tradeoffs"
sections, clear source attribution, factual/quotable phrasing over
marketing language, avoiding unverifiable superlatives?

## Context

Research consulted at this map's chartering found content with explicit
limitation sections and clear attribution reported to get cited measurably
more often by AI answer engines than purely promotional copy. This ticket
turns that into a concrete, referenceable house style. Feeds Site
(2.5.0)'s Ticket 2 (Homepage Messaging & Positioning) directly — messaging
shouldn't be drafted before this exists, alongside its existing
MCP-server-shipped blockers. Blocks Site (2.5.0)'s Ticket 2.

---
id: 406c9701-a5bf-4001-9bbc-a69c85463c67
createdAt: 2026-08-17T01:00:20.121Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
kind: grilling
map: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
status: unclaimed
---
# 7 — GEO Citation Measurement Approach

## Question

Once the site is live, how will we know whether it's actually being
surfaced/cited by AI answer engines (ChatGPT, Claude, Perplexity, Google AI
Overviews) — a lightweight, low/no-cost manual check, or a paid tracking
tool?

## Context

Paid GEO-tracking tools (Otterly.ai, Semrush's AI toolkit, Ahrefs Brand
Radar) exist but are built for teams running continuous campaigns, likely
overkill for a solo-maintained OSS project. A cheap alternative is a
periodic manual prompt-and-check routine (ask each engine neuron's target
queries, log whether/how it's cited). Decide the approach now so it's ready
to run the moment the site ships, rather than improvised later. Doesn't
block anything else in this map — can resolve any time.
