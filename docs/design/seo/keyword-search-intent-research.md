# Keyword & search-intent research: agentic-coding memory tools

**Date:** 2026-08-16
**Submitted by:** research pass requested against primary sources (official
docs/READMEs, first-party pricing/positioning pages, GitHub issues, Hacker
News/Reddit threads) as input to future SEO/GEO and homepage-messaging
work — see `docs/design/site/competitive-landscape-and-positioning.md` for
the prior positioning analysis this complements.
**Status:** raw research, not yet validated or adopted into any ticket.
Findings below are what was found in open web search on 2026-08-16, not a
comprehensive or statistically reliable keyword-volume study — no ranking
tool (Ahrefs/SEMrush/GSC) was available, so "wide open" / "contested"
judgments are qualitative, based on how populated and specific the SERP
results were for each phrase, not measured search volume.

**Method note on primary-source-ness:** live Google/ChatGPT autocomplete
and "People Also Ask" boxes were not directly observable in this
environment (no browser). What follows instead uses (a) the literal
query strings that returned strong, on-topic results in web search —
these approximate real query phrasing because they are drawn from
existing article/thread titles and headers that are themselves optimized
for how people actually search — and (b) direct fetches of primary
sources (GitHub issues, tool READMEs, official positioning pages, one HN
thread) for pain-point language and competitor self-description. Treat
frequency/rank claims as directional, not measured.

---

## 1. Query clusters by intent

### 1a. Informational intent ("what is X" / "how does X work")

| Phrase | Evidence it's a real query shape | Could neuron credibly rank/be cited? |
|---|---|---|
| "claude code memory" | Top organic results are docs.claude-mem.ai, mem0.ai/blog, Anthropic's own `code.claude.com/docs/en/memory`, xda-developers, claudedirectory.org — a full page of dedicated content, confirming this exact phrase is a live search target ([search results](https://www.google.com)). | Hard to rank on the bare phrase — Anthropic's own docs page (`code.claude.com/docs/en/memory`) outranks everything by default for a phrase containing their product name. neuron is better positioned for longer-tail variants like "claude code memory that's git-diffable" or "claude code memory alternative to CLAUDE.md." |
| "what is context rot" / "context rot claude code" | Multiple dedicated explainer posts exist (mindstudio.ai has two: "what is context rot claude code" and "context rot claude code skills bloated files") ([mindstudio.ai](https://www.mindstudio.ai/blog/what-is-context-rot-claude-code)). | Open-ish — "context rot" is a shared vocabulary term (coined/popularized around long-context degradation), not owned by one vendor. neuron's relevance-gated injection (ADR 0012) is a direct answer to this term and isn't yet cited by the existing explainer content. |
| "AI agent long-term memory" / "agent long-term memory" | Returns aggregator roundups (Braintrust, Vectorize, EverMind, Powerdrill) all titled almost identically: "Best AI Agent Memory Tools/Solutions/Frameworks in 2026" ([Braintrust](https://www.braintrust.dev/articles/best-ai-agent-memory-tools-2026), [Vectorize](https://vectorize.io/articles/best-ai-agent-memory-systems), [EverMind](https://evermind.ai/blogs/8-best-ai-agent-memory-frameworks-for-developers-in-2026), [Powerdrill](https://powerdrill.ai/blog/best-ai-agent-memory-solutions)). | Contested and saturated by SEO-farmed roundup content, all listing the same six names (Mem0, Zep, Letta, Cognee, Supermemory, Sentra). None of the four roundups fetched mention neuron or anything markdown-first — this is a crowded field but also one where a differentiated, correctly-scoped entrant (coding agents specifically, not generic chatbot memory) could get picked up in the *next* wave of these roundups if positioned distinctly enough to be worth a bullet. |
| "persistent memory for llm agents" | Returns a mix of official Claude docs (`platform.claude.com/docs/en/managed-agents/memory`), Mem0 blog posts, and dev.to tutorials ("Building a Claude Agent with Persistent Memory in 30 Minutes") ([search results](https://www.google.com)). | Same pattern as above — informational and dominated by Mem0's content-marketing volume and Anthropic's own docs. |
| "how does agent memory work" / temporal knowledge graph explainers | Zep owns this sub-cluster outright: `getzep.com/ai-agents/temporal-knowledge-graph/` is a dedicated definitional page for "What Is a Temporal Knowledge Graph?" ([Zep](https://www.getzep.com/ai-agents/temporal-knowledge-graph/)). | Zep-owned; not a fight worth entering. neuron doesn't use knowledge graphs, so this term isn't relevant to neuron's actual architecture anyway — a case of a phrase to avoid rather than contest. |

### 1b. Solution-seeking intent ("best tool for X" / "how to give X memory")

| Phrase | Evidence | Neuron fit |
|---|---|---|
| "how to give claude code memory" / "add persistent memory to claude code" | Direct hits: Mem0's own landing page is titled exactly "Add Persistent Memory to Claude Code with Mem0 (5-Minute Setup)" ([mem0.ai/blog/claude-code-memory](https://mem0.ai/blog/claude-code-memory)); MindStudio has "How to Add Persistent Memory to Claude Code: Short-Term, Long-Term, and Scoped Access" ([mindstudio.ai](https://www.mindstudio.ai/blog/persistent-memory-claude-code-short-long-term-scoped)). | This is the single highest-intent phrase cluster found — it's explicitly solution-seeking, names the exact product category, and Mem0 has already claimed the top slot with a page literally titled to match the query. Still winnable for a specific angle Mem0 doesn't cover: "...without a cloud account" / "...that stays in git." |
| "AI coding agent memory tool" comparisons, e.g. "recallium vs mem0 vs agentmemory vs claude-mem vs letta vs zep" | A Medium post exists with exactly this six-way comparison title ([Medium](https://medium.com/@code_context_10/ai-coding-assistants-that-actually-remember-recallium-vs-mem0-vs-agentmemory-vs-claude-mem-vs-93578406910f)); a SourceForge auto-generated comparison page also exists for "Mem0 vs. claude-mem" ([SourceForge](https://sourceforge.net/software/compare/Mem0-vs-claude-mem/)). | Notable: neuron is not in this list, and this is exactly the tool class neuron competes with (coding-agent-specific memory, not generic chatbot memory). Getting neuron added to hand-written comparison posts like this one (not just SEO-farmed roundups) is a more realistic near-term win than ranking organically against Mem0's domain authority. |
| "best ai agent memory tools for developers" / "mem0 alternatives" | TECHSY has a dedicated "9 AI Agent Memory Tools & Mem0 Alternatives (2026)" page ([techsy.io](https://techsy.io/en/blog/best-ai-agent-memory-tools)) — confirms "mem0 alternatives" is treated as its own query intent, not just a variant of "mem0." | Legitimate opening: "alternatives to X" pages exist specifically because searchers doubt or outgrow the market leader (cost, cloud dependency, scope mismatch for coding-only use). neuron's "100% offline, git-diffable, schema-enforced" pitch answers the alternatives-seeker's likely objections to Mem0 (cloud SaaS, Python/LangChain-first) directly. |
| "issue tracker for AI coding agents" | Beads (`gastownhall/beads`) and Beans (`hmans/beans`) both occupy this exact phrase, and a Better Stack Community guide is titled "Beads: A Git-Friendly Issue Tracker for AI Coding Agents" ([betterstack.com](https://betterstack.com/community/guides/ai/beads-issue-tracker-ai-agents/)). | **Closest direct competitor found in this research.** Beads's own README describes itself as "Distributed graph issue tracker for AI agents, powered by Dolt" and, separately, "a memory upgrade for your coding agent" — i.e. it claims almost the exact same combined "issue tracker + agent memory" positioning neuron uses (issue tracker is one of neuron's seven memory categories per `neuron.yaml`). This phrase is contested by a well-covered, actively-discussed tool (Ian Bull's blog post, Better Stack guide) — neuron would need to differentiate on the markdown-first/schema-enforcement/git-diffable angle, since Beads is graph+Dolt-backed, not plain-markdown. |
| "codebase blueprint" / "architecture linter for AI agents" | No dedicated competitor content found under this exact phrasing in this pass — closest adjacent hits were ADR-automation tools (Mneme HQ, "ADR Skill for Claude Code," `macromania/adr-agent`) and RAG-for-codebase tools (Sourcegraph Cody, Augment, Sentra) rather than a Tree-Sitter-scan-and-diff-gate framing. | Wide open on the exact phrase. This maps to neuron's `neuron scan --check` feature, already flagged in the competitive-landscape doc (idea D) as a candidate "architecture linter for CI" framing — this research pass finds no entrenched competitor owning that specific query, though "ADR automation" and "codebase RAG" are adjacent contested spaces (see §3). |

### 1c. Comparison / "vs" queries

| Phrase | Evidence | Note |
|---|---|---|
| "mem0 vs zep" / "mem0 vs claude-mem" / "claude code memory vs mem0 vs hindsight" | Vectorize has a dedicated page: "Claude Code Memory vs Mem0 vs Hindsight: Comparison" ([vectorize.io](https://vectorize.io/articles/claude-code-memory-vs-mem0-vs-hindsight)); SourceForge auto-generates "Mem0 vs. claude-mem" ([sourceforge.net](https://sourceforge.net/software/compare/Mem0-vs-claude-mem/)). | "X vs Y" is a well-established query pattern in this space with multiple pages per pairing already. neuron isn't in any observed pairing yet — getting into a hand-authored "neuron vs mem0" or "neuron vs beads" comparison (written honestly, from neuron's own docs, not astroturfed) is more attainable than ranking on generic "best of" lists. |
| "cursor vs claude code" (persistent-memory angle) | Multiple 2026 comparison posts exist (builder.io, decode.agency, codeaholicguy.com) but these compare the *editors*, not memory layers — memory is a sub-topic within them, not the query itself. | Adjacent, not directly neuron's phrase — these posts are about IDE/agent choice, not the memory-augmentation layer. Low priority. |
| "AGENTS.md vs CLAUDE.md" | A dedicated page exists at TaskPeace: "AGENTS.md vs CLAUDE.md — the difference, and how to use both" ([taskpeace.com](https://taskpeace.com/agents-md-vs-claude-md)). | This is a *format* comparison, not a tool comparison, but it's high-intent traffic for exactly the audience neuron wants: people already maintaining one or both files who are about to discover the maintenance burden doesn't go away by picking a format. A "why not both — and how neuron replaces the maintenance" angle fits here. |

---

## 2. CLAUDE.md / AGENTS.md pain-point language (verbatim, sourced)

This is the most directly relevant cluster for neuron's positioning, since
neuron's own README already frames itself against exactly this pain
("plain markdown... enforced by a schema it can't write around").

- **GitHub issue, primary source** — `anthropics/claude-code` issue
  [#14227](https://github.com/anthropics/claude-code/issues/14227),
  "Feature Request: Persistent Memory Between Claude Code Sessions"
  (closed as not planned, labeled `area:core`, `enhancement`, `memory`).
  Verbatim developer language from the issue: **"Claude Code starts every
  session with zero context."** ... **"It's a goldfish."** ...
  **"amnesia in the CLI."** ... and the closing framing: **"Users paying
  for Claude expect continuity across the product, not amnesia in the
  CLI."** This is the single clearest piece of primary evidence that
  "amnesia" is real developer vocabulary for this problem, not just
  marketing copy — and it's notable that Anthropic closed the issue as
  not planned at the product level, which is exactly the gap third-party
  tools (including neuron) exist to fill.
- **Hacker News, primary source** — thread
  [#47034087](https://news.ycombinator.com/item?id=47034087) discussing
  "Evaluating AGENTS.md: are they helpful for coding agents?" The
  underlying paper found human-written context files give only a
  marginal ~4% improvement on average, and LLM-generated ones *decrease*
  performance by ~3%; on Sonnet 4.5 specifically, human-written context
  *dropped* performance by over 2%. A commenter's dismissive framing
  captured on the thread: **"This file could be renamed CONTRIBUTING.md
  and be done with it."** Commenters also converged on "context rot" as
  the shared term for why bloated files backfire — every token in context
  influences output and degrades quality, so more isn't automatically
  better. Separately, HN discussion
  [#44957443](https://news.ycombinator.com/item?id=44957443) on the
  original "AGENTS.md – Open format for guiding coding agents"
  announcement is the primary thread for the format's launch itself.
- **DEV Community post, first-party account of the drift problem** — a
  documented internal decision log (glama.ai-hosted MCP server docs)
  states plainly that a project's CLAUDE.md had **grown to 112 lines and
  included content that was domain-specific, stale-prone (static file
  trees), or redundant** — a concrete, first-hand instance of the
  "unwieldy and drifting" pattern the research brief asked about
  ([glama.ai](https://glama.ai/mcp/servers/@vrppaul/semantic-code-mcp/blob/ec06c4ade73c3e57c79951b3d267ffd65d9d7c84/docs/decisions/002-agent-instruction-files.md)).
- **claudelint's own rule documentation** confirms this is common enough
  to warrant tooling: Claude Code itself **warns when a CLAUDE.md file
  reaches 40KB**, and claudelint's guidance is to split content into
  `.claude/rules/` files referenced via `@import` rather than one
  ever-growing file
  ([claudelint.com](https://claudelint.com/rules/claude-md/claude-md-size)).
  This is independent confirmation — from a linter built specifically to
  catch this failure mode — that "file got too big" is a common enough
  real-world state to need automated detection.
- **DEV Community, "Stop Fighting Your AGENTS.md File"** — framed around
  the same growth problem from the AGENTS.md side: recommends
  "composable markdown fragments" over one large file, and ships a
  companion tool (`ivawzh/agents-md`) whose own README pitch is "Scale
  your AI agent context with composable markdown fragments"
  ([dev.to](https://dev.to/ivawzh/stop-fighting-your-agentsmd-file-a-better-way-to-scale-ai-agent-documentation-51n4),
  [github.com/ivawzh/agents-md](https://github.com/ivawzh/agents-md)).
  This is a competitor to neuron's *format* pitch specifically —
  splitting one file into many is a different fix for the same symptom
  neuron addresses with a schema-validated, queryable store rather than
  more markdown files of the same kind.
- **Community-reported specific failure mode**: different contributors
  add conflicting rules to a shared AGENTS.md/CLAUDE.md and **"nobody
  does a full style pass,"** producing what one source called "an
  unmaintainable mess that actually hurts agent performance" (echoed
  across the `dev.to` and `agentpedia.codes` guides found in this pass).
  This maps directly to neuron's write-time supersession gate
  (`--supersedes`/`--not-a-reversal`/`--if-novel`) as a mechanism-level
  answer, not just a philosophical one.

**Takeaway for positioning:** the vocabulary developers actually use is
*"amnesia," "goldfish," "context rot," "stale," "drift," "bloated,"
"unwieldy,"* and *"nobody does a full style pass."* None of the
competitor content found in this pass (Mem0, Zep, claude-mem, Beads)
leads with the specific CLAUDE.md/AGENTS.md-decay framing as directly as
neuron's own README already does. That's a genuinely differentiated
entry point, not a contested one — but it's currently only stated in
neuron's own README, not yet targeted at any of the specific pain-point
phrases catalogued above (e.g. no neuron content found addressing "AGENTS.md vs CLAUDE.md," "context rot," or "AGENTS.md generator" audiences directly).

---

## 3. Competing categories: self-description and owned keywords

### Vector-DB / generic memory layers

- **Mem0** — self-describes as **"Mem0 - AI Memory Layer for your Agents
  & Apps | Persistent Context"** on its own homepage title tag
  ([mem0.ai](https://mem0.ai/)); GitHub tagline is **"Universal memory
  layer for AI Agents"** ([github.com/mem0ai/mem0](https://github.com/mem0ai/mem0)).
  Owns: "memory layer," "persistent context," "AI memory," and has
  ~58K GitHub stars giving it the largest community/tutorial footprint in
  the space per third-party comparisons
  ([vectorize.io](https://vectorize.io/articles/claude-code-memory-vs-mem0-vs-hindsight)).
  Also runs content marketing aimed squarely at neuron's target queries —
  e.g. a blog post titled exactly "Add Persistent Memory to Claude Code
  with Mem0 (5-Minute Setup)"
  ([mem0.ai/blog/claude-code-memory](https://mem0.ai/blog/claude-code-memory)).
  Explicitly cloud/Python/LangChain-first, SOC 2 / HIPAA / GDPR compliant
  — enterprise SaaS framing neuron's local-only architecture is a direct
  counter-positioning to.
- **Zep** — self-describes as **"Agent memory at enterprise scale"**
  ([getzep.com](https://www.getzep.com/)), owns "temporal knowledge
  graph" outright with a dedicated definitional page
  ([getzep.com/ai-agents/temporal-knowledge-graph](https://www.getzep.com/ai-agents/temporal-knowledge-graph/)).
  Enterprise/conversational-agent framing, not coding-specific.
- **Letta** — per third-party comparison coverage, positioned around
  agents that "actively manage their own memory" — a self-editing-memory
  architecture, not applicable to neuron's model
  ([braintrust.dev](https://www.braintrust.dev/articles/best-ai-agent-memory-tools-2026)).

### Claude-Code-specific memory tools (neuron's nearest neighbors)

This sub-category is far more crowded than the competitive-landscape doc's
three-tier matrix suggested — worth flagging as an update to that
document's Tier 3 framing:

- **claude-mem** — GitHub tagline: **"Persistent Context Across Sessions
  for Every Agent"**; docs describe it as capturing everything the agent
  does, **"compresses it with AI, and injects relevant context back into
  future sessions"**
  ([github.com/thedotmack/claude-mem](https://github.com/thedotmack/claude-mem),
  [docs.claude-mem.ai](https://docs.claude-mem.ai/introduction)). Stores
  AI-compressed summaries, not human-editable source-of-truth markdown —
  a real point of contrast with neuron's "markdown is the source of
  truth" model.
- **agentmemory** — self-describes as **"#1 Persistent memory for AI
  coding agents based on real-world benchmarks"** on GitHub
  ([github.com/rohitg00/agentmemory](https://github.com/rohitg00/agentmemory))
  and has a dedicated marketing site, agent-memory.dev, pitching
  **"persistent memory for AI coding agents"** that "runs locally with
  zero external databases" for Claude Code, Copilot CLI, Cursor, Gemini
  CLI, and any MCP client
  ([agent-memory.dev](https://www.agent-memory.dev/)). This is the
  closest single competitor found in local-only, coding-agent-specific
  positioning — neuron's differentiation has to be the schema-enforced,
  git-diffable markdown format and the issue-tracker/blueprint/git-notes
  categories, not "runs locally," since agentmemory already claims that.
- **Recallium** — per third-party comparison coverage, positioned as the
  only tool doing **cross-IDE memory** across Cursor, Claude Code, and
  VS Code at once
  ([vectorize.io](https://vectorize.io/articles/claude-code-memory-vs-mem0-vs-hindsight)).
- **Vektor** — MCP-server-based, seeds "core memory" with project info
  and preferences Claude remembers automatically (per dev.to coverage);
  narrower scope than neuron's structured categories.

### Plain-markdown context-file conventions/generators

- **AGENTS.md (the open standard itself)** — positioned as **"the open,
  tool-agnostic standard read by 28+ AI coding agents"** and already
  adopted by 60,000+ repositories per the Apify AGENTS.md Generator's own
  claim ([apify.com](https://apify.com/veridian-synthetics/agents-md-generator)).
  This isn't a competitor neuron can displace — AGENTS.md is a *format*
  neuron should probably interoperate with or migrate from, not compete
  against on the phrase itself. The competitive-landscape doc's
  Actionable-Idea (B), "detect existing CLAUDE.md/.cursorrules, offer
  migration," is directly validated by how established this convention
  already is.
- **`ivawzh/agents-md`** ("composable markdown fragments") and
  **ClaudeForge** (`alirezarezvani/claudeforge`, a "CLAUDE.md Generator
  and Maintenance tool... aligned with Anthropic's best practices") are
  both direct competitors on the "fix my unwieldy CLAUDE.md" query intent
  specifically — but both are pure-generator/splitter tools, not
  memory/recall systems. Neither adds relevance-gated injection,
  supersession logic, or a queryable store; they only reorganize the same
  static-file model. This is neuron's clearest differentiation opening:
  these tools treat the symptom (file size) while neuron replaces the
  underlying mechanism (static unconditional injection).

### Issue tracker + agent memory (closest direct analog)

- **Beads** (`gastownhall/beads`) — see §1b above. Tagline: **"Distributed
  graph issue tracker for AI agents, powered by Dolt"**; also markets
  itself, in the repo description, as **"a memory upgrade for your coding
  agent."** This is the one competitor found in this research that
  combines "issue tracker" and "agent memory" in the same product, as
  neuron does. Key architectural contrast: Beads is a **Dolt-backed
  graph** (dependency-aware, hash IDs for multi-agent merge-safety);
  neuron is **markdown-as-source-of-truth with SQLite as a disposable
  index**. Beads doesn't claim git-diffability of its actual data the way
  neuron does (Dolt has its own versioning model, distinct from plain-text
  git diffs) — that's a legitimate, checkable differentiation point if
  the maintainer wants to make it, but should be verified against Beads's
  actual docs before publishing as a claim (same caution the
  competitive-landscape doc already flags for its own comparison table).
- **Beans** (`hmans/beans`) — flat-file, plain-Markdown issue tracker
  ("`.beans` directory... readable by humans and machines") with a
  built-in GraphQL query engine
  ([github.com/hmans/beans](https://github.com/hmans/beans)). Closer to
  neuron's plain-markdown-file model than Beads is, but scoped to issue
  tracking only — no learnings/decisions/architecture categories, no
  relevance-gated recall, no harness hook injection.

### RAG-for-codebase tools

- **Sourcegraph Cody** — positions around **"Code Graph technology"** and
  codebase-wide embeddings-based RAG, explicitly targeting
  enterprise/monorepo scale ("300,000 repositories," "90GB monorepos")
  ([sourcegraph.com/blog/how-cody-understands-your-codebase](https://sourcegraph.com/blog/how-cody-understands-your-codebase)).
  This is a different problem than neuron solves — Cody answers "what
  does this code do," neuron answers "what did we already learn/decide
  about this code." Low keyword overlap in practice, but "codebase
  understanding" and "codebase context" are adjacent phrases worth
  avoiding in neuron's own copy to prevent confusing the two categories.
- **Sentra**, **Augment Code**, **CodeAlive**, **Repomix**,
  **Rememberizer** — grouped together in one roundup under **"Codebase
  Memory: The 6 Best Tools for AI Coding Agents (2026)"**
  ([sentra.app](https://www.sentra.app/articles/best-codebase-context-memory-tools)),
  which claims memory can cut agent tokens "by up to 76%." This roundup
  title is itself evidence that "codebase memory" is being used as a
  distinct query phrase from "agent memory" — worth tracking as a
  possible neuron-relevant phrase, though none of these six tools were
  independently verified in this pass beyond the roundup's own framing.

---

## 4. Summary: what's contested vs. open for neuron

**Contested / not worth fighting head-on:**
- "AI memory layer," "agent memory" generically — Mem0's domain authority
  and ~58K-star community footprint dominate.
- "Temporal knowledge graph" — Zep-owned outright, and architecturally
  irrelevant to neuron anyway.
- "Claude code memory" (bare phrase) — Anthropic's own docs page and
  Mem0's dedicated landing page both outrank by default.
- "Persistent memory for AI coding agents" (bare phrase) — agentmemory.dev
  already claims "#1" on this exact framing.

**Open or under-served — realistic targets:**
- "Issue tracker + memory for coding agents that stays in plain
  markdown" — Beads and Beans both partially occupy this, but neither
  combines issue-tracking with the *broader* memory categories (learnings,
  decisions, architecture) the way neuron does, and neither is
  markdown-as-source-of-truth with schema enforcement.
- "CLAUDE.md alternative" / "why is my CLAUDE.md so big" / "AGENTS.md
  drift" — real, well-documented pain (see §2) with generator/splitter
  tools addressing the symptom, but no tool found in this pass framing a
  schema-validated, queryable replacement as directly as neuron's own
  README already does.
- "Architecture linter for AI coding agents" / "codebase blueprint" —
  no entrenched competitor found on this specific phrasing; adjacent to
  ADR-automation tools and RAG-for-codebase tools but distinct from both.
- Hand-written comparison content ("neuron vs mem0," "neuron vs beads")
  — a more attainable win than organic ranking against SEO-farmed
  roundups, several of which (Medium's six-way comparison, SourceForge's
  auto-generated pages) show this content format is already normal in
  this space and welcomes new entrants.

**Not independently verified / flagged for follow-up:** none of the
comparative claims above (Beads's Dolt-versioning-vs-git-diff framing,
the exact GitHub star counts, the "76% token reduction" figure from the
Sentra roundup) were checked against the competitors' own benchmark
methodology — they're reported as found in secondary coverage or the
competitor's own marketing copy, not verified first-hand. Same caution as
the prior competitive-landscape doc: confirm before any claim goes on the
homepage.
