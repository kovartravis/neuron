# Relevance Floor — Baseline Measurement on the neuron Store

Measured 2026-08-03 while grilling ticket `11`. This is the **pilot** that
motivated ticket `39`; it is not the validation. Sample is 20 queries against a
single, unusually self-referential store, and the decisive margin is 0.061.

## Setup

- Store: this repo's own memory (`a8541890092e7e49.sqlite`) — **271 entries**
  (34 `decisions`, 167 `history`, 70 `learning`), 384-dim.
- Embedder: `TransformersEmbedder`, `Xenova/bge-small-en-v1.5` q8, `cls` pooling,
  normalized. Query side uses `embedQuery`, which prepends BGE's
  `"Represent this sentence for searching relevant passages: "` instruction.
- Similarity: dot product of normalized vectors, i.e. cosine — the same quantity
  `src/index.ts:476` ranks on.
- Script: [`relevance-floor-baseline.js`](relevance-floor-baseline.js).

Two query shapes were measured separately, because they are not the same
distribution and the hook uses the first one:

- **prompt-shaped** — what a developer types at an agent, which is what a
  `pre-prompt` hook receives verbatim.
- **keyword-shaped** — what a hand-written `neuron memory query` looks like.

One deliberate off-topic probe was included in each set as a negative control.

## Results

| shape | on-topic r1 | off-topic r1 | store median | store p90 |
|---|---|---|---|---|
| prompt-shaped | 0.635–0.789 | 0.491 (`my cat is sitting on the keyboard`) | ~0.51 | ~0.60 |
| keyword-shaped | 0.643–0.826 | 0.574 (`quantum entanglement`) | ~0.49 | ~0.60 |

Mean r1−median gap: **0.182** prompt-shaped, **0.236** keyword-shaped.

### 1. A floor is viable, and the margin is thin

Every on-topic top hit clears **0.635**; both negative controls fall below
**0.575**. A gate at 0.60 separates all 20 queries correctly — on a **0.061**
margin. BGE compresses this store into roughly 0.4–0.8, so there is no
comfortable gap, only a usable one. `quantum entanglement` scoring 0.574 against
a store containing nothing about physics is the number to keep in mind.

### 2. An absolute floor cannot size the payload

The rank curve's steepness varies per query far more than its height does:

- `why is neuron status reporting zero entries` — r1 0.722 → r10 0.701.
  **Ten entries inside 0.021.**
- `add a new tree-sitter grammar for ruby` — r1 0.789 → r3 0.707.
  **Two entries before a 0.08 drop.**

A single absolute cutoff therefore admits ten entries from one query and two from
the next, driven by how densely the store happens to cover that topic rather than
by relevance. Hence the two-part design ticket `39` tests: an **absolute gate**
on r1 answering *whether* to inject at all, and a **relative band** below r1
answering *how many* — with the character ceiling as the hard bound.

### 3. These numbers do not contradict `05`, and the map's gist misreads it

The map's one-line gist of ticket `05` says its raw-cosine premise was *"factually
wrong — measured 0.4375–0.5565"*, which reads as though **any** top hit scores in
that band. It does not, and nothing here contradicts it. The source, in ticket
`07`'s out-of-scope entry, is specific:

> ADR 0010 §2's premise that a **nonsense query's** top hit **scores** ≥0.75 is
> false (measured 0.4375–0.5565, because a nonsense query gets no FTS hits and
> `normRrf` caps at 0.5)

That is the **RRF `score`** for **nonsense** queries. This document measures
**raw cosine** for **on-topic** queries. Different quantity, different population;
the numeric proximity is coincidence.

The two are consistent. The negative controls here land at cosine 0.491 and
0.574 — low, as `05` found by its own measure. Ticket `07`'s independently
measured cosines (0.6548–0.9516 on real queries) agree with the 0.635–0.826 band
above.

**No open contradiction.** The map's gist is what needs a word added, not the
measurement. Recorded here because the compressed form invites exactly the
misreading it produced during `11`'s grilling — the sort of thing a one-line
index costs, and cheap to fix.
