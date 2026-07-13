Type: prototype
Status: resolved
Blocked by: 01

## Question

How should the hybrid retrieval score combine semantic similarity and 1-5 importance ranking? What is the mathematical formula, the weight coefficients, and how does it behave under simulated datasets? We need to prototype and verify this scoring formula.

## Answer

Through the interactive logic prototype in [src/prototype-hybrid-search.ts](file:///root/neuron/src/prototype-hybrid-search.ts), we verified and aligned on the **Linear Interpolation** formula with a weight of **0.75** for semantic similarity.

### Verified Formula

$$Score = 0.75 \times \text{Similarity} + 0.25 \times \text{NormalizedImportance}$$

Where:
- $\text{Similarity}$ is the dot product/cosine similarity of the query embedding and record embedding, producing a value in $[0, 1]$ (given unit-normalized vectors).
- $\text{NormalizedImportance} = \frac{\text{Importance} - 1}{4}$, which maps the $1\text{--}5$ importance rating onto the range $[0, 1]$.
  - Importance 1 $\rightarrow$ 0.0
  - Importance 2 $\rightarrow$ 0.25
  - Importance 3 $\rightarrow$ 0.50
  - Importance 4 $\rightarrow$ 0.75
  - Importance 5 $\rightarrow$ 1.0

### Rationale

This combination maintains semantic relevance as the primary driver of ranking (75% weight) while allowing highly important records (importance 4-5) to rank higher than slightly more relevant but low-importance entries (e.g. temporary/minor logs). Completely irrelevant items (low similarity) will not rise to the top even if they have high importance.

### Prototype Asset

The interactive logic prototype can be run via:
```bash
npm run prototype:hybrid
```
