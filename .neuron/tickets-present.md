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
- [2 — Information Architecture & URL/Citability Conventions](4b5c1114-812d-4533-a992-7bebb4ca3ec1) — flat
  single-segment `/docs/` slugs, one concept per page, strict H1-title/
  H2-only headings (docs-only), Q&A blocks scoped to high-intent pages
  only, self-contained-quotability as a hard rule (carries to homepage),
  and permanent slugs (restructure via new pages, not renames). Grilled
  live with the maintainer. Feeds Site (2.5.0)'s Ticket 3 (Docs IA) and
  informs Ticket 6.
- [3 — Structured Data & Schema.org Strategy](3e0edd28-4651-4fc8-897f-5f44dad8b294) —
  homepage carries `WebSite` + `SoftwareApplication` + `FAQPage`; every
  docs page carries `TechArticle` uniformly, with `FAQPage` added on the
  four pages Ticket 2 scoped Q&A blocks to; attribution is `Person`
  (Travis Kovar), not `Organization` — solo-maintained OSS project;
  `BreadcrumbList` explicitly skipped given the flat URL IA. Grilled live
  with the maintainer. Feeds Site (2.5.0)'s Ticket 7 (Build the Homepage).
- [5 — llms.txt / llms-full.txt Decision & Draft](787c805a-69dd-409f-8060-91efa97fa044) —
  publish both: `llms.txt` hand-maintained, `llms-full.txt` build-generated
  from Starlight's content collection at Site (2.5.0) Ticket 5's build step
  to avoid drift. Structural template (Docs / How It Works / Optional
  sections, ADR log demoted to Optional) drafted against Ticket 2's IA with
  placeholder slugs — final link list waits on Site (2.5.0)'s Ticket 3.
  Full draft: docs/design/seo/llms-txt-draft.md.
- [6 — Content-Authoring Guidelines for AI Citability](a3cc1972-e455-4c61-9ec4-bcc873c6353d) —
  four rules, grounded in patterns already live in README.md: limitations
  sections are content-driven (only pages whose topic has a real
  README-disclosed caveat get a `## Limitations` H2, always last on the
  page); source attribution covers both byline (`Person`, Ticket 3) and
  evidence-linking (every measured claim links its source); factual/
  quotable phrasing enforced via both a positive rule (no standalone
  adjective claims) and a concrete banned-superlatives list. Grilled live
  with the maintainer. Feeds Site (2.5.0)'s Ticket 2. Full guide:
  docs/design/seo/content-authoring-style-guide.md.
- [7 — GEO Citation Measurement Approach](406c9701-a5bf-4001-9bbc-a69c85463c67) —
  manual, no-cost monthly check across all four target engines (ChatGPT,
  Claude, Perplexity, Google AI Overviews) against a fixed 8-query set
  drawn from Ticket 1; logs the full mention spectrum (linked, named-but-
  unlinked, or unattributed) rather than a binary yes/no. Grilled live
  with the maintainer. Log and query set: docs/design/seo/geo-citation-log.md.

## Not yet specified

- What triggers a content refresh once real citation data exists — Ticket 7
  settled the check's own cadence (monthly) and what counts as a citation,
  but not how a maintainer should react to a bad run (e.g. a page that
  never gets cited after several checks). Can't specify until the site is
  live and Ticket 7's log has real data to react to.

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
status: resolved
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

## Answer

Grilled live with the maintainer. Seven conventions, settled:

1. **URL structure**: flat, single-segment slugs off `/docs/`
   (e.g. `/docs/wayfinder`, `/docs/how-it-works-hybrid-search`) — no
   nested URL segments, even if Starlight's source content is organized
   into folders. Shorter, more stable, and a citation doesn't depend on
   knowing the site's nav to make sense.

2. **Page granularity**: one concept per page. Each "How It Works" topic
   (hybrid search/RRF, write-side enrichment, declared field schema,
   storage adapters) gets its own page/slug rather than being grouped —
   lets each compete for its own query and gives an AI engine a single
   focused URL to attribute a quote to, rather than a grab-bag page.

3. **Heading hierarchy** (docs pages only, see point 7): strict H1
   (declarative page title, stating the concept as a claim — e.g. "Hybrid
   Search & RRF Ranking," not "Overview") / H2-only subsections, no H3+
   nesting. A page needing H3-deep structure is a signal it should be
   split into more pages (point 2), not a case for relaxing this.

4. **FAQ/Q&A blocks**: scoped, not boilerplate. Only on high-intent pages
   — homepage, Getting Started, CLI Reference, and a dedicated
   alternatives/comparison page (per Ticket 1's finding that
   comparison/"alternatives" query intent is the open, winnable space).
   This is content-placement convention only; the actual `FAQPage`
   JSON-LD markup is Ticket 3 on this map's call (Structured Data &
   Schema.org Strategy), not this ticket's.

5. **Self-contained quotability** (hard rule, carries to homepage — see
   point 7): every H2 section (or homepage section) must stand alone —
   define its own terms, no "as mentioned above," no pronoun references
   to prior sections. An AI engine extracting one section has no access
   to what came before it on the page, so a section that leans on prior
   context risks being quoted wrong. Accept light repetition (e.g.
   restating "neuron" instead of "it") as the cost of this — Ticket 6
   should treat it as settled, not relitigate it as a prose nitpick.

6. **URL stability**: slugs are permanent once published. Restructuring
   means adding a new page (new slug) and, if needed, marking the old one
   deprecated with a pointer forward — not renaming or moving an existing
   URL out from under a citation an AI engine may have already indexed.
   Redirect/canonical tag mechanics themselves belong to Ticket 4
   (Sitemap, Robots.txt & Canonical URL Setup) on this map.

7. **Scope — docs vs. homepage**: points 1-3 (URL structure, page
   granularity, heading cap) are docs-only — the homepage is a single
   page whose visual layout is Site (2.5.0)'s Ticket 4's own `/prototype`
   call, not constrained by a docs-oriented structural rule. Points 4-5
   (Q&A block placement, self-contained quotability) are citability rules
   and carry over to the homepage too.

**Feeds forward**: Site (2.5.0)'s Ticket 3 (Docs Information Architecture)
can now build the real page list/nav against these conventions instead of
deciding them ad hoc. Ticket 6 (Content-Authoring Guidelines) should adopt
point 5 (self-contained quotability) as settled house style rather than
re-deciding it.

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
status: resolved
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

## Answer

Grilled live with the maintainer. Per-template JSON-LD convention, settled:

1. **Homepage**: `WebSite` (site-level container: name, url) +
   `SoftwareApplication` (applicationCategory: DeveloperApplication,
   operatingSystem, offers with price: "0", author) stacked together, plus
   `FAQPage` sourced from the homepage's own visible Q&A block (Ticket 2
   scoped Q&A placement; this ticket settles its markup).

2. **Docs pages**: `TechArticle` uniformly across every docs page — Getting
   Started, CLI Reference, every "How It Works" concept page, and the
   alternatives/comparison page. One template-level rule, no per-page
   judgment calls about which pages count as technical. Carries headline
   (the H1), description, author, and datePublished/dateModified if
   Starlight's frontmatter tracks them (Ticket 7/Ticket 5's scaffolding
   call, not decided here).

3. **FAQPage, additionally**: on exactly the four pages Ticket 2 already
   scoped Q&A blocks to — homepage, Getting Started, CLI Reference, and the
   alternatives/comparison page. Each Question/acceptedAnswer pair maps 1:1
   to a real visible Q&A block already in the page content — no markup for
   synthetic or hidden questions. Stacks alongside that page's primary type
   (e.g. `TechArticle` + `FAQPage` together on Getting Started).

4. **Attribution**: `Person` (Travis Kovar, GitHub profile url), not
   `Organization` — this is a solo-maintained OSS project (LICENSE: Travis
   Kovar, MIT; no registered org behind `kovartravis`), and claiming an
   `Organization` would misrepresent it ahead of Ticket 6's citability
   principles. One shared `Person` fragment reused as `author` on the
   homepage's `SoftwareApplication` and on every docs page's `TechArticle`,
   not re-typed per page.

5. **Explicitly skipped**: `BreadcrumbList`. Ticket 2's flat, single-segment
   `/docs/` URL IA removes the usual reason for it (inferring hierarchy from
   the URL path), and nothing else in this map calls for a docs taxonomy —
   low marginal signal for a new template obligation.

**Feeds forward**: Site (2.5.0)'s Ticket 7 (Build the Homepage) implements
this table directly rather than inventing its own markup. A page may stack
multiple JSON-LD blocks (the homepage carries three).

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
status: resolved
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

## Answer

**Publish both.** `llms.txt`: yes, hand-maintained (short, changes rarely).
`llms-full.txt`: yes, but build-generated from Starlight's content
collection at Site (2.5.0) Ticket 5's Astro build step, not hand-mirrored —
avoids drift for zero incremental cost once a real content collection
exists. Both live at the site root per the llms.txt convention (H1 title,
blockquote summary, H2-grouped Markdown link lists).

Since Site (2.5.0)'s own Ticket 3 (Docs IA) hasn't committed a real page
inventory yet, this ticket drafts `llms.txt`'s **structure and topic
curation** (Docs / How It Works / Optional sections, ADR log demoted to
Optional per the map's no-raw-ADR-dump stance) against Ticket 2's flat
`/docs/<slug>` convention, using placeholder slugs standing in for
Site's Ticket 3's real ones. Full template, rationale, and the
`llms-full.txt` generation approach:
docs/design/seo/llms-txt-draft.md.

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
status: resolved
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

## Answer

Grilled live with the maintainer. Four rules, all grounded in patterns
already live in README.md rather than invented:

1. **Limitations sections are content-driven, not page-type-driven** — a
   docs page gets a `## Limitations` H2 (always last on the page, after
   any Q&A block) only if its topic already has a real caveat disclosed in
   README.md (e.g. per-harness recall coverage, exec being purely
   informational, the write-side compliance gap). No manufactured
   limitations on pages with nothing genuine to disclose.
2. **Source attribution, both senses**: byline attribution to Travis Kovar
   as `Person` (Ticket 3's schema.org decision) *and* evidence-linking —
   every quantitative/measured claim must link to its backing source
   (benchmark file, A/B results), mirroring README's existing citation
   pattern. A bare number is not publishable copy.
3. **Factual/quotable phrasing, both a positive rule and a banned list**:
   every claim must be falsifiable/backed by a fact or link (no adjective
   allowed to stand alone); plus a concrete banned-superlatives list
   (best-in-class, revolutionary, seamless, blazing-fast, cutting-edge,
   world-class, state-of-the-art, game-changing, effortless, robust,
   powerful, next-gen, unparalleled) — verified README.md already avoids
   all of these, so this locks in existing practice rather than imposing a
   new one.

Feeds Site (2.5.0)'s Ticket 2 directly. Full guide:
docs/design/seo/content-authoring-style-guide.md.

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
status: resolved
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

## Answer

Grilled live with the maintainer. Manual, no-cost routine — no paid
tracking tool:

1. **Engines**: all four named at chartering — ChatGPT, Claude, Perplexity,
   Google AI Overviews.
2. **Queries**: a fixed set of 8, pulled from Ticket 1's keyword research,
   reused every check so results are comparable month to month (not
   re-derived per check).
3. **Cadence**: monthly, starting once the site ships.
4. **Citation definition**: log the full spectrum, not a binary yes/no —
   direct source link, named-but-unlinked mention, or content clearly
   drawn from the site without attribution.
5. **Log location**: `docs/design/seo/geo-citation-log.md`, dated entries
   per check.

Full query list, table template, and log:
docs/design/seo/geo-citation-log.md.

---
id: 53f4a3e4-d25e-449e-acc8-2f65f7aedaef
createdAt: 2026-08-17T10:43:28.209Z
importance: 4
tags:
  - planning
  - distribution
  - install
taskId: null
kind: map
status: unclaimed
---
# Map — Curl-Installable Standalone Binary

## Destination

`curl -fsSL https://raw.githubusercontent.com/kovartravis/neuron/main/install.sh
| sh` installs a real, no-Node-required `neuron` executable — built for
macOS + Linux (x64/arm64) and Windows (x64/arm64), released as GitHub
Release assets in the same `publish.yml` run that publishes to npm, same
version number. `npm install -g @kovartravis/neuron` stays fully supported
alongside it — this is additive, not a replacement. Reached when the curl
command works end-to-end on every target platform, `neuron upgrade`
self-updates the binary, and the README documents both install paths.

## Notes

- **Chartered 2026-08-17**, at the maintainer's request, to give neuron a
  curl-installable distribution path alongside the existing npm package.
- **Settled during chartering** (pre-ticket scoping calls, not tickets):
  - **npm stays** — additive, not a replacement. A full npm-to-binary
    migration was considered and declined as a much larger destination
    than this effort needs.
  - **Install URL is a raw GitHub URL**
    (`raw.githubusercontent.com/kovartravis/neuron/main/install.sh`), not
    site-hosted — so this map has **no dependency** on Map — neuron.github.io
    Site (2.5.0). A nicer front-end URL can be layered on later without
    changing the mechanism.
  - **This map carries execution**, per the wayfinder skill's own override
    clause — same posture as the other three active maps. Tickets ship a
    working binary + install script, not just a spec.
  - **Platform matrix**: macOS + Linux + Windows, x64 + arm64 — full matrix
    at launch, not a phased rollout.
  - **Release cadence**: binaries build and publish in the same
    `.github/workflows/publish.yml` run as the npm publish, same version
    number — no separate release cadence, no drift between install paths.
  - **Key feasibility fact, found during chartering**: both of neuron's
    native deps already have pure-JS/WASM fallback paths —
    `better-sqlite3` falls back to the built-in `node:sqlite` in
    `src/db.ts`'s `openDatabase`/`createNodeSqliteWrapper`, and
    `onnxruntime-node` falls back to `onnxruntime-web` (WASM) in
    `src/components/embedder.ts`. ML model weights also aren't bundled —
    they download lazily into a user-level cache dir via `env-paths`
    (`env.cacheDir`) on first use, same as today. So a single portable
    binary doesn't strictly require per-platform native addons or embedded
    model weights; Ticket 3 decides whether to bundle native addons anyway
    for performance.
  - **Code signing**: no Apple Developer account or Windows signing cert
    currently available (maintainer confirmed no/unknown at chartering).
    Treated as an open ticket (4), not assumed solved — unsigned binaries
    trip Gatekeeper/SmartScreen warnings until/unless resolved.
  - **Windows install UX**: maintainer wants this benchmarked against what
    comparable CLIs actually do (winget was named specifically) rather than
    assumed to be a straight PowerShell port of the curl pattern — Ticket 2
    is a real research ticket, not a rubber-stamp.
- **Skills to consult**: `/research` for Tickets 1 and 2 (packaging tool,
  Windows convention survey); `/grilling` for Tickets 3 and 4 (binary
  composition, code-signing tradeoff).

## Decisions so far

- [1 — Packaging Tool for the Standalone Binary](docs/design/distribution/packaging-tool-research.md) —
  `@yao-pkg/pkg` (actively maintained fork of the archived vercel/pkg), the
  only one of the four candidates whose own docs claim unqualified
  cross-compilation of all six targets from a single Linux CI runner; Node
  SEA tracked as a migration candidate once its VFS work and macOS-x64 CI
  coverage mature; nexe eliminated (17-month-stale beta); Bun declined
  despite being fastest, since it would move neuron onto Bun's runtime in
  production. Feeds Ticket 3 (native-addon bundling), Ticket 4
  (code-signing), and Ticket 5 (CI build matrix).

- [2 — Windows Install Convention](docs/design/distribution/windows-install-convention-research.md) —
  primary: a PowerShell `irm <url>/install.ps1 | iex` one-liner (Bun's
  `powershell -c "irm ... | iex"` wrapped shape), mirroring Deno's and
  Bun's own verified scripts — both fetched and read directly, both ship
  this as their primary, first-documented Windows method. rustup's
  `.exe`-download pattern and ripgrep/fd's Releases-page-first convention
  were both real alternatives found but declined: neither matches the
  one-paste-line UX the curl pattern sets on macOS/Linux. Secondary:
  publish a winget manifest (peer-listed, not headline, per Deno's own
  posture) — winget is close to universal on modern Windows but not
  guaranteed present at first login per Microsoft's own docs, and Bun's
  community winget package has a live unresolved PATH bug
  (oven-sh/bun#20868) as a concrete caution. Tertiary: a scoop bucket
  entry. Chocolatey declined. Feeds Ticket 7 (ship the Windows install
  path).

- [3 — Native Addon Bundling vs WASM-Only](f561802a-c31d-4f66-802c-fe47acf7d170) —
  bundle native (`better-sqlite3`, `onnxruntime-node`) per platform/arch, not
  WASM-only. pkg's own docs rule out auto-fetching cross-platform native
  binaries during cross-compilation, but neither dependency needs that:
  `onnxruntime-node` already ships prebuilt binaries for all 6 targets inside
  its own npm package, and `better-sqlite3` fetches a prebuilt binary per
  target via `prebuild-install` at install time — no native compilation
  either way. Real CI cost for Ticket 5 is staging six prebuilt binaries into
  six pkg outputs, not cross-compiling six times. The existing WASM/
  `node:sqlite` runtime fallback stays in the binary as a safety net rather
  than being stripped. Working assumption for Ticket 5 to confirm: "Linux"
  means glibc, since pkg can't bundle native addons for `linuxstatic`/musl.
  Feeds Ticket 5 (CI build matrix).

- [4 — Code Signing: Notarize/Sign Now, or Ship Unsigned?](9cbc685c-807e-4f69-b599-c39d5d011824) —
  ship unsigned at launch, accepting the Gatekeeper/SmartScreen warning.
  Decided live with the maintainer: the audience is developers/CLI users
  who already know how to right-click-Open or `xattr -d
  com.apple.quarantine`, not a broader non-technical crowd the warning
  could turn away. Not ruled out permanently — signing ($99/yr Apple
  Developer + notarization pipeline, plus a Windows Authenticode/EV cert)
  is an accepted, unscheduled follow-up, with no formal revisit trigger
  (no complaint count or install-volume milestone tied to it). Tickets
  5-8 proceed against unsigned binaries.

- [5 — Extend `publish.yml`, CI Build Matrix](docs/design/distribution/ci-build-matrix.md) —
  shipped: `build-binaries` (6-target matrix, one `ubuntu-latest` runner per
  Ticket 1's cross-compile story) + `release-assets` (SHA256SUMS, GitHub
  Release) jobs, gated on `dist_tag == 'latest'`. `scripts/build-binary.mjs`
  does the packaging. Surfaced two real findings docs alone couldn't have:
  **(a)** `@yao-pkg/pkg` has no working ESM entry-point support at all
  (matches the long-open vercel/pkg#1291) — fixed by pre-bundling
  `dist/cli.js` to a single CJS file with esbuild before handing it to pkg;
  **(b)** `onnxruntime-node`'s native binding can't be made to load inside a
  pkg snapshot even as an explicit asset, narrowing Ticket 3's "bundle both
  native addons" — `better-sqlite3` bundles and loads correctly (confirmed),
  but the packaged binary runs every ONNX-backed feature (embeddings,
  reranking, NLI, summarization) on WASM only. Confirmed non-fatal: a failed
  vector-index write doesn't crash the command and reconciles from markdown.
  Accepted as a v1 rough edge, same posture as Ticket 4's unsigned-binary
  call — unscheduled follow-up, not a blocker. Feeds Ticket 6 (`install.sh`)
  and Ticket 7 (Windows install path), which verify against `SHA256SUMS`.

- [6 — Write and Ship `install.sh`](8d843d50-a002-4f95-aa87-bae23db12535) —
  shipped: a POSIX `sh` script at the repo root, detects OS/arch via
  `uname`, resolves the latest GitHub Release tag via the API, downloads
  the matching asset plus `SHA256SUMS`, and hard-fails (non-zero exit, no
  install) on any missing or mismatched checksum entry. Installs to
  `$HOME/.neuron/bin` by default, overridable via `NEURON_INSTALL`
  (mirrors Bun/Deno's own-directory convention, per Ticket 2's research).
  Verified end-to-end (happy path, checksum-mismatch rejection, PATH-
  already-set) against a local mock release server, since no real Release
  with Ticket 5's asset names has been cut yet. Windows explicitly out of
  scope — points to Ticket 7 in its own error message. Unblocks Ticket 8
  (`neuron upgrade`) and Ticket 9 (README install-path docs), both already
  specified and now frontier.

- [7 — Ship the Windows Install Path](c1680372-4dc8-4502-9b98-d86b31cbe007) —
  shipped: `install.ps1` at the repo root, the primary `irm <url> | iex`
  channel Ticket 2's research recommended (Deno/Bun's mechanics — real-arch
  detection via `RuntimeInformation.OSArchitecture`, install to
  `NEURON_INSTALL`/`%USERPROFILE%\.neuronin`, user-scope PATH via .NET
  `SetEnvironmentVariable`), verified against Ticket 5's real asset shape
  (a raw `.exe`, not the zip the research speculated about pre-build) and
  reusing Ticket 6's `SHA256SUMS`-or-refuse discipline. Not run against a
  real release or real PowerShell — none available yet, same gap
  `install.sh` already carries. Winget (secondary) and Scoop (tertiary)
  deferred rather than filed for real: both need a real cut release to
  pin a real version/URL/SHA256, and winget means a PR against the
  external `microsoft/winget-pkgs` repo — drafted as templates instead
  (`packaging/winget/`, `packaging/scoop/`), same accepted-follow-up
  posture as Ticket 4 and Ticket 5. Full record:
  docs/design/distribution/windows-install-path.md. Unblocks Ticket 9
  (README install-path docs) alongside Ticket 6, already specified and
  now frontier.

- [8 — Implement `neuron upgrade`](33f6a40c-9a1e-432f-aeb4-325bc672be5f) —
  shipped: a top-level `neuron upgrade` command that self-replaces the
  running standalone binary in place, checksum-verified against the
  release's `SHA256SUMS` (same discipline as Ticket 6), atomic and
  rollback-safe if the swap fails mid-way, and a hard no-op (with a pointer
  to `npm install -g @kovartravis/neuron@latest`) for an npm install. Along
  the way, fixed a real gap Tickets 6/7 had already promised but never
  delivered: `install.sh`/`install.ps1` both tell the user to run `neuron
  --version`, which didn't exist until this ticket added it — now also the
  mechanism `upgrade` itself uses to know its own version, baked in at
  build time via esbuild `--define` since a pkg binary has no `package.json`
  next to it at runtime. Does not touch the real packaging/release pipeline
  (Ticket 5) or either install script (Tickets 6, 7) — verified against a
  local mock GitHub API + Releases server, not a real cut release, same
  honest gap those tickets already carry. Doesn't unblock or block Ticket 9.

- [9 — README Install-Path Documentation](f35a2408-6091-415d-ac5e-422d62a154e2) —
  shipped: README.md's Quick start now documents both paths side by side —
  npm alongside Ticket 6's real `install.sh` one-liner in one block, Ticket
  7's real `install.ps1` one-liner in a separate `powershell` block, both
  copied verbatim from the scripts' own header comments so they can't drift
  — plus a one-line pointer to `neuron upgrade` (curl/PowerShell) vs `npm
  update -g` (npm), since Ticket 8 gave the two paths different upgrade
  commands. Deferred winget/scoop templates deliberately left undocumented
  (no real pinned release to point them at yet). This was the map's last
  live ticket — no unclaimed, unblocked children remain.

## Not yet specified

- Whether/how Map — neuron.github.io Site (2.5.0)'s homepage quickstart
  should feature the curl command once it exists — fog until this map has
  a real, working install command to link; not this map's own concern to
  ticket.
- Supply-chain trust beyond SHA256 checksums (e.g. Sigstore/cosign signing
  of the checksums file) — not sharp enough to ticket until Ticket 4's
  code-signing decision lands and there's a real threat model to react to.

## Out of scope

- **Dropping the npm install path** — npm stays fully supported;
  considered and declined at chartering (see Notes). Revisiting this would
  be a fresh scoping decision, not a resumption of this map.

---
id: 143a05c6-41b4-40fd-a448-045c1538637e
createdAt: 2026-08-17T10:43:51.213Z
importance: 4
tags:
  - architecture
  - release
  - publish
taskId: null
kind: research
map: 53f4a3e4-d25e-449e-acc8-2f65f7aedaef
status: resolved
---
## Question

Which packaging tool should build neuron's standalone binary — Node's
built-in Single Executable Application (SEA) support, `pkg`, `nexe`, or
Bun's `bun build --compile`?

Given the map's chartering fact that both native deps (`better-sqlite3`,
`onnxruntime-node`) already have pure-JS/WASM fallbacks (`src/db.ts`,
`src/components/embedder.ts`), and ML model weights download lazily at
runtime rather than bundling — does the chosen tool need to support native
addons at all, or can this ship as a WASM-only, pure-JS bundle for maximum
portability? Compare: maintenance status, native-addon support (in case
Ticket 3 decides to bundle them anyway), cross-compilation story (can a
Linux CI runner produce a macOS/Windows binary, or does it need matching
runners per target), resulting binary size, and startup time versus the
current `node dist/cli.js` invocation.

Feeds nearly every other ticket on this map — the packaging tool choice
constrains what's possible for binary composition (Ticket 3), the CI build
matrix (Ticket 5), and code-signing mechanics (Ticket 4).

## Answer

Researched primary sources (Node.js docs, GitHub repos/API, npm registry)
across all four candidates. Full findings:
docs/design/distribution/packaging-tool-research.md.

**Recommendation: `@yao-pkg/pkg`** (v6.22.0, actively maintained fork of
the archived vercel/pkg — vercel/pkg confirmed archived, last push
2024-01-03), for the binary-composition and CI-build-matrix tickets, with
Node's own SEA support tracked as a migration candidate once its VFS work
and macOS-x64 CI coverage mature (pkg's own README points the same
direction).

**Eliminated: nexe** — 17-month-stale beta (5.0.0-beta.4, published
2025-03-08), ~1 maintenance commit/year, 164 open issues not being worked
down, no documented cross-compilation story, and native-addon support
that's a "ship the .node file as a separate sidecar" instruction rather
than real bundling.

**Considered and declined: Bun `build --compile`** — the fastest (111ms
vs Node SEA's 139.7-161.3ms per a named third-party Hyperfine benchmark)
and best-documented cross-compilation story (8 explicit `--target`
values, one host builds all six targets) of the four, but disqualified
because shipping via Bun means neuron runs on Bun's runtime in production,
not Node's — every `node:sqlite`/`onnxruntime-web` fallback path in
`src/db.ts` and `src/components/embedder.ts` would need
re-verification against Bun's Node-API compatibility layer. A materially
larger bet than a packaging-tool swap; worth revisiting only if neuron
considers Bun as a runtime target in its own right.

**The deciding tradeoff**: pkg is the only one of the four whose own docs
make an unqualified claim that a single Linux CI runner can cross-build
all six targets (macOS/Linux/Windows × x64/arm64) today. Node SEA's own
docs explicitly mark macOS x64 as untested in Node's own CI, and
cross-platform SEA builds require disabling the flags (`useCodeCache`/
`useSnapshot`) that make its startup competitive.

**Not verified this pass** (flagged in the doc, re-check before committing
to the CI-matrix ticket's design): no actual cross-compilation was run;
pkg's binary-size/startup-time figures are proxies from the Node-SEA
benchmark, not pkg-specific measurements; native-addon bundling wasn't
tested against neuron's actual `better-sqlite3`/`onnxruntime-node`
binaries.

**Feeds forward**: unblocks Ticket 3 (native-addon bundling decision —
pkg's snapshot-extraction mechanism handles either outcome without a
tooling change) directly, and Ticket 5 (CI build-matrix) and Ticket 4
(code-signing) indirectly.

---
id: 81577dba-f63f-4548-bebe-d99311608c4c
createdAt: 2026-08-17T10:43:51.773Z
importance: 4
tags:
  - testing
  - exec
  - failure-fix
taskId: null
kind: research
map: 53f4a3e4-d25e-449e-acc8-2f65f7aedaef
status: resolved
---
## Question

What's the right one-command install convention for Windows users?

`curl | sh` has no real equivalent tradition on Windows. Survey what
comparable dev-tool CLIs actually ship: Deno, Bun, and rustup use a
PowerShell `irm https://.../install.ps1 | iex` pattern; ripgrep, fd, and
many Rust-ecosystem tools also publish to `winget` and/or `scoop`;
some projects offer more than one of these simultaneously. The maintainer
specifically flagged winget as something they've seen used — this ticket
should come back with a concrete recommendation (one primary method, maybe
a secondary) rather than assuming the PowerShell port is automatically
right.

Feeds Ticket 7 (ship the Windows install path).

## Answer

Primary: a PowerShell `irm <url>/install.ps1 | iex` one-liner, invoked
as `powershell -c "irm https://<neuron-install-host>/install.ps1 | iex"`
(Bun's exact wrapped-invocation shape, pasteable from any shell context —
not Deno's bare form, which assumes an already-open PowerShell prompt).
This is what both of the two most directly comparable prior-art tools —
Deno and Bun, both single-binary language/runtime CLIs distributed the
same way neuron would be — actually ship as their **primary,
first-documented** Windows method, verified by fetching their real
install.ps1 scripts (not assumed from secondary sources). rustup and the
ripgrep/fd survey do NOT use this pattern (rustup ships a downloadable
rustup-init.exe; ripgrep/fd point to a manual Releases-page download
first), but neither fits neuron's stated one-paste-line UX goal the way
the piped-script pattern does.

The script itself should mirror Deno's/Bun's verified mechanics: download
a prebuilt zip per arch (neuron-windows-x64.zip / -arm64.zip) from GitHub
Releases, extract to %USERPROFILE%\.neuron\bin (override via a
NEURON_INSTALL env var, mirroring DENO_INSTALL/BUN_INSTALL), and add that
dir to user-scope PATH via .NET's
[System.Environment]::SetEnvironmentVariable (Deno's approach — simpler
than Bun's raw registry-key write, no elevation needed).

Secondary: publish a winget manifest (winget install <publisher>.neuron)
as an additional, not primary, channel — mirroring Deno's posture (winget
peer-listed, not headline) rather than Bun's (no winget mention at all).
Verified via Microsoft's own docs that winget is close to universal on
Windows 11 / Windows 10 1809+ but not guaranteed present at first login,
excluded from Windows Sandbox, and has a hard version floor — every
Microsoft-documented fallback for a missing winget is itself a PowerShell
command, so a winget-only instruction has no self-contained fallback.
Bun's own community winget package has a live, unresolved PATH bug
(oven-sh/bun#20868) — concrete evidence that a winget manifest is a
second maintenance surface with its own failure modes, separate from
neuron's own installer, worth having but not worth trusting alone.

Tertiary: a scoop bucket entry — low incremental cost, since scoop's own
install command (irm get.scoop.sh | iex) is the same PowerShell-irm idiom
neuron's installer already uses. Chocolatey: not recommended — lowest
signal-to-effort ratio of the channels surveyed, never a tool's own
first-party-documented primary or clear second-ranked method in anything
fetched directly.

Full findings, citations, and comparison table:
[Windows install convention research](../../docs/design/distribution/windows-install-convention-research.md)

Not verified (flagged in the research doc, follow-up for the implementing
ticket): no actual neuron install.ps1 was built or tested; the
winget-pkgs manifest submission/review process wasn't researched; scoop.sh's
own landing page failed to fetch (Scoop's install command was instead
confirmed from its installer repo's README, still a primary source).

---
id: f561802a-c31d-4f66-802c-fe47acf7d170
createdAt: 2026-08-17T10:43:52.337Z
importance: 4
tags:
  - sqlite
  - architecture
  - termux
taskId: null
blockedBy: 143a05c6-41b4-40fd-a448-045c1538637e
kind: grilling
map: 53f4a3e4-d25e-449e-acc8-2f65f7aedaef
status: resolved
---
## Question

Should the standalone binary bundle native addons (`better-sqlite3`,
`onnxruntime-node`) per platform/arch for performance, or ship a single
WASM-only build (using the existing `node:sqlite` and `onnxruntime-web`
fallback paths) for simplicity and true cross-platform portability across
all 6 targets (macOS/Linux/Windows × x64/arm64)?

Grill the tradeoff: bundling native addons means 6 separate binary builds
with platform-specific native modules staged alongside the SEA/compiled
executable (exact mechanics depend on Ticket 1's packaging tool answer) and
a real perf difference (better-sqlite3 and onnxruntime-node are both
meaningfully faster than their WASM counterparts); WASM-only means one
build recipe reused 6 ways, simpler CI, smaller surface for Ticket 5, at
some runtime performance cost users on the npm path don't pay today.

## Answer

Bundle native addons (`better-sqlite3`, `onnxruntime-node`) per
platform/arch, not WASM-only.

Grilled the '6x build complexity' framing against pkg's own docs and what's
already in `node_modules`: it doesn't hold up as a blocker. pkg (the
Ticket 1 packaging tool) does not auto-fetch cross-platform native binaries
during cross-compilation — its docs say to 'install the right prebuilt
binary for that target (or rebuild it with prebuildify/node-gyp)' — but
neither dependency actually needs native compilation per target.
`onnxruntime-node` already ships prebuilt `.node` binaries for all 6
target combos inside its own npm package
(`bin/napi-v3/{darwin,linux,win32}/{x64,arm64}`) — no rebuild, no fetch.
`better-sqlite3` uses `prebuild-install`, which downloads a prebuilt
binary per platform/arch from its own GitHub Releases at install time — no
local compilation either. So the real CI cost Ticket 5 needs to handle is
staging six prebuilt binaries into six pkg outputs, not cross-compiling C++
six times. Given that, the performance win (`better-sqlite3` vs
`node:sqlite`, `onnxruntime-node` vs `onnxruntime-web`) is close to
free.

The binary keeps the existing runtime fallback path
(`src/db.ts`'s `node:sqlite` fallback, `src/components/embedder.ts`'s
`onnxruntime-web` fallback) as a safety net rather than stripping it —
if a bundled native addon somehow fails to load at runtime on some
platform, it degrades to WASM instead of crashing. Cheap insurance,
already built, for a first release of a new distribution channel.

Working assumption carried to Ticket 5 (not decided here): 'Linux' in the
platform matrix means glibc Linux, since pkg's docs say native bindings are
unsupported on `linuxstatic`/Alpine/musl targets — Ticket 5 should
confirm/handle this explicitly when it builds the CI matrix.

Feeds Ticket 5 (CI build matrix: stage the right prebuilt native binary per
target) and Ticket 6 (install.sh — no impact, still one script).

---
id: 9cbc685c-807e-4f69-b599-c39d5d011824
createdAt: 2026-08-17T10:43:52.875Z
importance: 4
tags:
  - db-schema
  - architecture
  - failure-fix
taskId: null
kind: grilling
map: 53f4a3e4-d25e-449e-acc8-2f65f7aedaef
status: resolved
---
## Question

Pursue macOS notarization + Windows Authenticode signing now, or ship
unsigned at launch and accept the Gatekeeper/SmartScreen warning?

No Apple Developer account or Windows signing cert currently exists
(confirmed at chartering). Grill the real tradeoff: an Apple Developer
account is $99/year plus a notarization pipeline step; Windows Authenticode
certs have their own cost and acquisition process. Shipping unsigned means
users see a scary first-run warning (and on macOS, an extra
right-click-Open or `xattr -d com.apple.quarantine` step) — weigh that
friction against the cost/effort of signing, and decide whether this
blocks launch or is an accepted-tradeoff-for-now with a follow-up path.

## Answer

Ship unsigned at launch. Decided via live grilling with the maintainer:

- **Audience is developers/CLI users**, not a broader non-technical crowd —
  the same audience rustup/deno/bun's own early unsigned or lightly-signed
  releases targeted. That audience already knows how to right-click-Open or
  run `xattr -d com.apple.quarantine`, so the Gatekeeper/SmartScreen warning
  is real friction but not a launch-blocking one.
- **Not a hard no-go** — explicitly considered and declined blocking launch
  on signing. Signing is accepted as a later, unscheduled follow-up, not
  ruled out of scope entirely.
- **No formal revisit trigger.** Deliberately left open-ended rather than
  tied to a complaint count or an install-volume milestone — a future
  maintainer call, not something this ticket or map commits to watching
  for. If/when a Apple Developer account ($99/yr + notarization pipeline
  step) and a Windows Authenticode/EV cert get acquired, that's a fresh
  scoping decision.

No CI or code changes required by this ticket — it's a scope decision, not
an implementation. Tickets 5-8 (CI build matrix, install.sh, Windows
install path, `neuron upgrade`, README) proceed against unsigned binaries.

---
id: 1f3592a2-1032-4295-b3dc-405d05a63fe8
createdAt: 2026-08-17T10:44:12.890Z
importance: 4
tags:
  - npm
  - git
  - release
taskId: null
blockedBy: 143a05c6-41b4-40fd-a448-045c1538637e,f561802a-c31d-4f66-802c-fe47acf7d170
kind: task
map: 53f4a3e4-d25e-449e-acc8-2f65f7aedaef
status: resolved
---
## Question

Extend `.github/workflows/publish.yml` so the `publish` job also builds
the standalone binary for every target platform/arch (macOS/Linux/Windows ×
x64/arm64), using Ticket 1's packaging tool and Ticket 3's bundling
decision, attaches each as a GitHub Release asset alongside the existing
npm publish step, and generates a `SHA256SUMS` file covering all of them
for the install scripts (Tickets 6, 7) to verify against.

Must stay inside the same run as the existing npm publish job so both
install paths ship the exact same version with no drift — the map's
chartering note on release cadence. Reuses the existing version/dist-tag
resolution logic already in the workflow (only `latest`-tagged releases
get binaries, matching how `rc` prereleases already skip real npm
promotion, unless Ticket 1/3 surface a reason to diverge).

## Answer

Shipped. `publish.yml` gets two new jobs: `build-binaries` (a 6-target
matrix, all on `ubuntu-latest` since pkg cross-compiles from one Linux
runner per Ticket 1's research), and `release-assets` (downloads all 6
artifacts, generates `SHA256SUMS`, creates/updates the GitHub Release via
`gh release create`/`upload`). Both gated on `dist_tag == 'latest'`, no
divergence from the rc-skips-binaries default. `scripts/build-binary.mjs`
does the actual packaging, invoked as `npm run build:binary -- <target>`.

Full mechanism, and two real blocking findings neither Ticket 1's research
nor Ticket 3's grilling could have caught from docs alone, are written up
in docs/design/distribution/ci-build-matrix.md — summary:

1. **`@yao-pkg/pkg` has no working ESM entry-point support** (confirmed
   live against this codebase's real dependency tree, not just pkg's
   docs — matches the long-open vercel/pkg#1291). Fix: pre-bundle
   `dist/cli.js` to a single CJS file with esbuild first (own correct
   `"exports"` resolution at bundle time), hand pkg *that* instead of the
   ESM output. Needs the standard esbuild `import.meta.url` shim
   (`createRequire`/asset-path resolution in db.ts/embedder.ts/
   generator.ts/harness.ts would otherwise silently break under CJS).
2. **`onnxruntime-node`'s native binding cannot be made to load inside a
   pkg snapshot**, even listed explicitly as a pkg asset — its
   `binding.js` resolves the `.node` file via a computed `path.join()`,
   which pkg's own error says plainly it can't handle ("specify a literal
   in 'require' call"). Tried and confirmed NOT a fix: extending the
   existing Android/Termux `require.cache`-patching WASM shim
   (`src/shared/crossPlatformShims.ts`, now de-duplicated out of
   embedder.ts/generator.ts) to trigger on `process.pkg` — doesn't
   propagate into pkg's own module loader. `better-sqlite3` bundles and
   loads correctly (confirmed with a real cross-target `prebuild-install`
   fetch, e.g. Linux x64 from a macOS host, targeting the pkg-embedded
   Node's ABI via `--target 22.13.0`, not the CI host's own Node version).

**Net effect, narrower than Ticket 3's literal decision:** the packaged
binary ships `better-sqlite3` native, but runs every ONNX-backed component
(embeddings, reranking, NLI polarity, summarization) without native
acceleration — confirmed this degrades gracefully rather than crashing
(`memory add` against the packaged binary returns `{"status":"created"}`
with a printed warning; neuron's write path already tolerates a failed
vector-index step and reconciles from markdown). The `npm install` path is
completely unaffected — it never touches pkg's snapshot fs. Fixing ONNX
Runtime's native path for real inside a pkg binary is unscheduled
follow-up, same posture Ticket 4 already set for code signing: an accepted
v1 rough edge, not a blocker.

**Independent fix, found along the way:** `reranker.ts` and
`nliClassifier.ts` were missing the Android/Termux WASM-forcing shim
entirely (`embedder.ts`/`generator.ts` had it, they didn't) — a real,
pre-existing gap unrelated to pkg. Now consistent across all four
`@huggingface/transformers` call sites via the de-duplicated shared shim.

**Also confirmed and worth recording:** macOS enforces code-signature
validity on any `dlopen()`'d native addon, especially on Apple Silicon — an
unsigned `.node` file loaded outside pkg's own extraction mechanism gets
SIGKILL'd by the kernel (`CODESIGNING`/"Invalid Page", not a catchable JS
error). Hit this directly testing `better-sqlite3` manually on this
machine; fixed locally with `codesign --sign - --force` /
`npm rebuild better-sqlite3`. pkg's own native-addon extraction handles
this correctly for the actual packaged binary (confirmed: the packaged
binary's `better-sqlite3` loads and writes fine, no crash) — this is a
local-dev-only gotcha from bypassing pkg's extraction flow, not a defect in
the shipped pipeline, but worth flagging since it's exactly the kind of
thing that looks like the binary itself is broken if hit blind.

Verified locally end-to-end for the host target (macOS arm64,
`@yao-pkg/pkg` 6.22.0): binary builds, runs `--help`, and completes a real
`memory add` (entry created, embedder/reranker paths exercised, exit 0).
The other 5 targets use the identical mechanism but weren't individually
smoke-tested outside the CI matrix definition itself. `npm test` (781
tests) shows the same 431 passed / 113 failed / 24 errors before and after
this change (confirmed via `git stash` comparison) — pre-existing
CLI-integration test-isolation gaps, not a regression from this ticket.
`neuron scan --check` and `neuron status --check` both exit 0 against the
new files (a separate, pre-existing `status --check` category-drift
failure reproduces identically on unmodified baseline code too — local
database history, not CI-visible, not this ticket's concern).

Feeds Ticket 6 (`install.sh`) and Ticket 7 (Windows install path), which
verify against `SHA256SUMS`.

---
id: 8d843d50-a002-4f95-aa87-bae23db12535
createdAt: 2026-08-17T10:44:13.447Z
importance: 4
tags:
  - failure-fix
  - publish
  - release
taskId: null
blockedBy: 1f3592a2-1032-4295-b3dc-405d05a63fe8
kind: task
map: 53f4a3e4-d25e-449e-acc8-2f65f7aedaef
status: resolved
---
## Question

Write and ship `install.sh` at the repo root: detects OS (macOS/Linux)
and arch (x64/arm64), downloads the matching GitHub Release binary asset,
verifies it against `SHA256SUMS` (Ticket 5), installs it to a directory on
$PATH (with a sane default and a way to override it), and `chmod +x`s it.

This is the script `curl -fsSL
https://raw.githubusercontent.com/kovartravis/neuron/main/install.sh | sh`
runs. Fail loudly and exit non-zero on checksum mismatch — never install an
unverified binary. Print a clear next-step message on success (e.g. `neuron
--version` to confirm).

## Resolution

Shipped: `install.sh` at the repo root (POSIX `sh`, no bashisms — matches
the `| sh` pipe in the destination's own install command). Detects
`uname -s`/`uname -m`, maps to Ticket 5's asset names
(`neuron-<macos|linux>-<x64|arm64>`), resolves the latest release tag via
the GitHub API, downloads the asset plus `SHA256SUMS`, and compares a
locally computed `sha256sum`/`shasum -a 256` digest against the entry for
that exact filename. A missing or mismatched entry hard-fails (non-zero
exit, no install) before anything touches disk — verified live via three
end-to-end runs against a local mock GitHub-release server (a temp dir
served over `python3 -m http.server` with a fake `api/latest.json`,
release asset, and SHA256SUMS, referenced via an env-substituted copy of
the real script so the shipped file itself needed no test-only branches):
(1) happy path installed a fake binary, `chmod +x`'d it, and it ran; (2) a
corrupted SHA256SUMS entry correctly aborted with exit 1 and left the
install directory nonexistent; (3) a pre-populated PATH correctly
suppressed the 'add to PATH' hint. Install directory defaults to
`$HOME/.neuron/bin`, overridable via `NEURON_INSTALL` (mirrors Bun's
`BUN_INSTALL`/Deno's `DENO_INSTALL` convention, consistent with Ticket 2's
research). Windows is explicitly out of scope for this script (points to
`install.ps1`/Ticket 7 in its own error message for an unsupported OS).
Ticket 8 (Implement `neuron upgrade`) and Ticket 9 (README install-path
docs) were already correctly specified and blocked on this ticket — no new
fog to graduate, both are now unblocked.

---
id: c1680372-4dc8-4502-9b98-d86b31cbe007
createdAt: 2026-08-17T10:44:13.938Z
importance: 4
tags:
  - release
  - failure-fix
  - db-schema
taskId: null
blockedBy: 81577dba-f63f-4548-bebe-d99311608c4c,1f3592a2-1032-4295-b3dc-405d05a63fe8
kind: task
map: 53f4a3e4-d25e-449e-acc8-2f65f7aedaef
status: resolved
---
## Question

Ship the Windows install path per whatever Ticket 2's research
recommends — a PowerShell `install.ps1` (`irm ... | iex`), a winget
manifest submission, a scoop bucket, or some combination.

Reuse Ticket 6's checksum-verification discipline regardless of mechanism —
never install an unverified binary on Windows either.

## Answer

Shipped `install.ps1` at the repo root — the primary channel Ticket 2's
research recommended (Deno/Bun's `irm <url> | iex` shape, wrapped in
`powershell -c "..."` for pasteability). Detects arch via
RuntimeInformation.OSArchitecture (correct under x64-on-ARM64 emulation,
no registry read needed), downloads the real asset Ticket 5's CI matrix
produces — `neuron-windows-x64.exe` / `neuron-windows-arm64.exe`, a raw
exe, not the zip the research doc speculated about before a real build
existed — verifies it against the release's SHA256SUMS (same file, same
discipline as install.sh/Ticket 6), installs to
$env:NEURON_INSTALL or %USERPROFILE%\.neuron\bin, and adds that dir to
the user-scope PATH via .NET SetEnvironmentVariable (Deno's mechanism, the
simpler of the two the research verified). Not run against a real release
(none cut yet, same gap install.sh carries) or a real PowerShell (none
available in this dev environment) — reviewed by hand against sha256sum's
real two-space output format and Deno/Bun's own verified script mechanics
instead.

Winget (secondary) and Scoop (tertiary), per the research's own ranking,
are deferred rather than filed for real: both need a real cut release to
pin a real version/URL/SHA256, and winget specifically means a PR against
the external microsoft/winget-pkgs repo — not fabricated against
placeholder data. Drafted as templates instead (packaging/winget/,
packaging/scoop/, README explaining the gap), same accepted-follow-up
posture Ticket 4 (unsigned binaries) and Ticket 5 (WASM-only ONNX) already
set on this map. Chocolatey not drafted, per the research's explicit
recommendation against it. Full record:
docs/design/distribution/windows-install-path.md.

Unblocks Ticket 9 (README install-path docs), which was waiting on this
ticket alongside Ticket 6.

---
id: 33f6a40c-9a1e-432f-aeb4-325bc672be5f
createdAt: 2026-08-17T10:44:14.451Z
importance: 4
tags:
  - publish
  - release
  - git
taskId: null
blockedBy: 1f3592a2-1032-4295-b3dc-405d05a63fe8,8d843d50-a002-4f95-aa87-bae23db12535
kind: task
map: 53f4a3e4-d25e-449e-acc8-2f65f7aedaef
status: resolved
---
## Question

Implement a `neuron upgrade` command for the standalone binary: checks
GitHub Releases for a version newer than the running binary, downloads the
matching platform/arch asset, verifies its checksum (reusing Ticket 6's
verification logic rather than re-implementing it), and atomically replaces
the currently-running executable.

Binary-only — this command doesn't need to (and shouldn't try to) handle
upgrading an npm-installed `neuron`; `npm install -g` already owns that
path. Consider what happens if replacing the running binary fails
mid-swap (e.g. permissions) — should leave the old binary working, never a
half-replaced broken state.

## Answer

Shipped: `neuron upgrade` (`src/commands/upgrade.ts`), registered as a
top-level command in `src/cli.ts` alongside `exec`/`scan`/`hook` (no
project/memory store needed). Guarded on `typeof process.pkg !==
'undefined'` — an npm-installed `neuron` refuses immediately with a pointer
to `npm install -g @kovartravis/neuron@latest`, never attempting the binary
swap.

Flow: resolves the platform/arch asset name the same way `install.sh` does
(`process.platform`/`process.arch` instead of `uname`) → fetches
`GET /repos/kovartravis/neuron/releases/latest`, compares `tag_name` against
the running version → downloads the matching asset plus `SHA256SUMS` from
the same release → verifies via `node:crypto` sha256 (same algorithm/
discipline as Ticket 6's shell `sha256sum`/`shasum` check, reimplemented
rather than shared code since there's no sh/TypeScript sharing mechanism) →
atomically replaces the running executable, refusing to install on any
checksum mismatch.

Found and fixed a real pre-existing gap while building this: both
`install.sh` and `install.ps1` (Tickets 6, 7) already tell the user to run
`neuron --version` to confirm the install, but the CLI had no `--version`/
`-v` flag at all. Added one (`src/components/version.ts`'s
`getRunningVersion()`), which doubles as the exact mechanism `upgrade`
needs to know its own current version.

Two non-obvious correctness points `getRunningVersion`/`atomicReplace`
exist to handle, both explicitly flagged in this ticket's own text:

1. **Knowing the running binary's own version.** A pkg-packaged binary has
   no `package.json` sitting next to it at runtime (`install.sh` drops a
   single file) — solved by baking the version in at build time via
   esbuild's `--define` (`scripts/build-binary.mjs`, same mechanism the
   existing `import.meta.url` shim already uses), read through a `typeof
   __NEURON_VERSION__ !== 'undefined'` guard so the plain `tsc` build npm
   publishes falls through unaffected to reading `package.json` two
   directories up from the entry point (same shape
   `checkBinaryVersionMismatch` already relies on). Verified live: bundled
   `dist/cli.js` through the real esbuild `--define` step and confirmed
   `--version` prints the injected value.
2. **Never a half-replaced binary.** `atomicReplace` stages the downloaded
   asset in the *same directory* as the running executable (not the system
   tmpdir) so the final swap is a same-filesystem rename — a rename across
   filesystems (tmpfs → the real install dir) can fail with `EXDEV`, which
   would otherwise silently turn "atomic" into "sometimes." The swap itself
   is backup-then-rename-then-cleanup: current → `<path>.old`, staged →
   current, then best-effort delete of `.old`; if the second rename fails,
   it rolls back from `.old` immediately and re-throws. On Windows this
   relies on a real platform fact worth recording: the OS opens a running
   executable's image with `FILE_SHARE_DELETE`, so renaming (not deleting
   in place) the currently-executing file is allowed — the same trick
   Chrome/electron-updater rely on.

Tested: `resolveAssetTarget`/`assetName`/`compareVersions`/`sha256File` as
pure unit tests; `atomicReplace` both on the happy path and on an induced
second-rename failure (confirms rollback leaves the original content
intact, no stray `.old`); a full `runUpgrade` end-to-end pass against a
local mock GitHub API + Releases server (`node:http`, in the spirit of
Ticket 6's own mock release server for `install.sh`) covering: successful
download-verify-replace, checksum-mismatch rejection (binary left
untouched, no stray staged file), already-up-to-date (asserts zero download
requests made), and `--check` (reports availability, makes no download
requests). `handleUpgradeCommand`'s `--help` output and its not-running-
under-pkg guard (naturally exercised under vitest/npm, no mocking needed)
are also covered. 18 new tests, `npm test` 799/799, `tsc --noEmit` clean,
`neuron scan --check` clean after re-baselining for the new
`upgrade.ts`/`version.ts` export surface, `neuron status --check` shows the
same pre-existing `undeclaredCategories` drift as `main` (confirmed via
`git stash` comparison) — unrelated to this ticket.

Not exercised: a real end-to-end run of the actual packaged pkg binary
self-replacing itself (would need a full native-addon `build:binary` run
and a real GitHub Release to point at) — same gap Tickets 6 and 7 already
carry for their own install scripts, closed once a real release with these
assets exists.

Ticket 9 (README install-path docs) is the map's other already-specified
frontier ticket; this one didn't block it and doesn't unblock anything
further itself.

---
id: f35a2408-6091-415d-ac5e-422d62a154e2
createdAt: 2026-08-17T10:44:43.202Z
importance: 4
tags:
  - publish
  - release
  - npm
taskId: null
blockedBy: 8d843d50-a002-4f95-aa87-bae23db12535,c1680372-4dc8-4502-9b98-d86b31cbe007
kind: task
map: 53f4a3e4-d25e-449e-acc8-2f65f7aedaef
status: resolved
---
## Question

Update README.md's install section to document both install paths side by
side: the existing `npm install -g @kovartravis/neuron`, and the new
`curl -fsSL
https://raw.githubusercontent.com/kovartravis/neuron/main/install.sh | sh`
(plus whatever Ticket 7 shipped for Windows).

Make clear neither is more "official" than the other per the map's
chartering decision that npm stays fully supported — this is an additive
second path, not a deprecation notice for the first.

## Answer

Rewrote README.md's Quick start section (the only install-instructions
location in the repo): a lead-in line states neither path is more
"official," followed by two fenced blocks — npm alongside Ticket 6's real
`install.sh` one-liner (macOS/Linux) in one `bash` block, then Ticket 7's
real `install.ps1` one-liner (wrapped in `powershell -c "..."`, matching
its own pasteable-from-any-shell design) in a separate `powershell` block
so syntax highlighting matches each command's actual shell. Both curl/
PowerShell one-liners were copied verbatim from the scripts' own header
comments (`install.sh`/`install.ps1`), not retyped, so they can't drift
from what Tickets 6/7 actually shipped.

Added one line beyond the ticket's literal ask: since Ticket 8 shipped
`neuron upgrade` as a binary-only self-updater (a no-op with a pointer to
`npm install -g @kovartravis/neuron@latest` under npm), and the two
install paths now have different upgrade commands, the install section
says which upgrade path applies to which install method — otherwise a
curl-installed user reading the rest of this repo's docs would have no
way to know `npm update -g` doesn't apply to them. Kept to one line;
no new section, no upgrade walkthrough.

Did not touch Ticket 7's own deferred winget/scoop templates
(`packaging/winget/`, `packaging/scoop/`) — those aren't real, publishable
packages yet (no pinned version/URL/SHA256 against a real cut release),
so surfacing them in the README would document an install path that
doesn't work. Out of this ticket's scope; revisit once a real release
exists to point them at.

Verified by reading the rendered section back (`README.md:61-95`): both
commands match `install.sh`/`install.ps1`'s own header-comment usage
lines exactly, byte for byte.
