/**
 * PROTOTYPE: Hybrid Search Scoring Formula
 * 
 * Question:
 * How should the hybrid retrieval score combine semantic similarity and 1-5 importance ranking?
 * What is the mathematical formula, the weight coefficients, and how does it behave under simulated datasets?
 * 
 * This is a throwaway interactive logic prototype to verify and visually inspect how different
 * candidates for hybrid ranking behave under realistic query scenarios.
 * 
 * Run using:
 *   npm run prototype:hybrid
 */

import readline from 'node:readline';

// ============================================================================
// 1. Pure Logic: Scoring Formulas
// ============================================================================

export interface MockItem {
  id: string;
  content: string;
  importance: number; // 1-5
  baseSimilarity: Record<string, number>; // Mock similarity per query name
}

export interface ScoredResult {
  item: MockItem;
  similarity: number;
  importanceScore: number;
  hybridScore: number;
}

/**
 * Strategy A: Linear Interpolation
 * Score = w * Similarity + (1 - w) * NormalizedImportance
 * where NormalizedImportance = (Importance - 1) / 4 (scales 1-5 to 0-1)
 */
export function scoreLinear(
  item: MockItem,
  query: string,
  weight: number // 0 to 1 (importance of similarity vs importance)
): ScoredResult {
  const sim = item.baseSimilarity[query] ?? 0;
  const normImp = (item.importance - 1) / 4;
  const hybrid = weight * sim + (1 - weight) * normImp;
  return { item, similarity: sim, importanceScore: normImp, hybridScore: hybrid };
}

/**
 * Strategy B: Multiplicative Boosting (Exponential)
 * Score = Similarity * (boostFactor ^ (Importance - 3))
 * where Importance 3 is neutral (1x), 4-5 are boosted (>1x), and 1-2 are penalised (<1x).
 */
export function scoreMultiplicative(
  item: MockItem,
  query: string,
  boostFactor: number // e.g. 1.2
): ScoredResult {
  const sim = item.baseSimilarity[query] ?? 0;
  const exponent = item.importance - 3;
  const multiplier = Math.pow(boostFactor, exponent);
  const hybrid = sim * multiplier;
  return { item, similarity: sim, importanceScore: item.importance, hybridScore: hybrid };
}

/**
 * Strategy C: Multiplicative Linear Boosting
 * Score = Similarity * (1 + alpha * (Importance - 3))
 */
export function scoreLinearBoost(
  item: MockItem,
  query: string,
  alpha: number // e.g. 0.2
): ScoredResult {
  const sim = item.baseSimilarity[query] ?? 0;
  const multiplier = Math.max(0, 1 + alpha * (item.importance - 3));
  const hybrid = sim * multiplier;
  return { item, similarity: sim, importanceScore: item.importance, hybridScore: hybrid };
}

// ============================================================================
// 2. Simulated Dataset
// ============================================================================

export const SIMULATED_QUERIES = [
  'deployment instructions',
  'database setup & config',
  'minor details / logs'
];

export const DATASET: MockItem[] = [
  {
    id: '1',
    content: 'Deployment checklist: steps to ship the production build, migrate DB, and verify SSL.',
    importance: 5,
    baseSimilarity: {
      'deployment instructions': 0.88,
      'database setup & config': 0.45,
      'minor details / logs': 0.12
    }
  },
  {
    id: '2',
    content: 'Temporary debug log: fixed spelling typo in CLI parameter description.',
    importance: 1,
    baseSimilarity: {
      'deployment instructions': 0.35,
      'database setup & config': 0.15,
      'minor details / logs': 0.85
    }
  },
  {
    id: '3',
    content: 'Setup PostgreSQL guide: database connections, connection pooling, and schema migration command.',
    importance: 4,
    baseSimilarity: {
      'deployment instructions': 0.65,
      'database setup & config': 0.92,
      'minor details / logs': 0.22
    }
  },
  {
    id: '4',
    content: 'Local SQLite WAL mode config: PRAGMA journal_mode = WAL speedups.',
    importance: 3,
    baseSimilarity: {
      'deployment instructions': 0.21,
      'database setup & config': 0.78,
      'minor details / logs': 0.35
    }
  },
  {
    id: '5',
    content: 'General team code guidelines regarding JS docstring preservation.',
    importance: 5,
    baseSimilarity: {
      'deployment instructions': 0.10,
      'database setup & config': 0.10,
      'minor details / logs': 0.15
    }
  },
  {
    id: '6',
    content: 'Staging deployment pipeline: how the automated github action publishes the staging container.',
    importance: 2,
    baseSimilarity: {
      'deployment instructions': 0.82,
      'database setup & config': 0.30,
      'minor details / logs': 0.40
    }
  }
];

// ============================================================================
// 3. Interactive TUI
// ============================================================================

interface AppState {
  currentQueryIndex: number;
  weight: number;          // Strategy A weight (similarity ratio)
  boostFactor: number;     // Strategy B boost
  alpha: number;           // Strategy C alpha
}

const state: AppState = {
  currentQueryIndex: 0,
  weight: 0.7,
  boostFactor: 1.25,
  alpha: 0.25
};

function renderFrame() {
  // Clear the screen and move cursor to home position
  process.stdout.write('\x1Bc');

  const query = SIMULATED_QUERIES[state.currentQueryIndex];

  console.log('\x1b[1m=== HYBRID SEARCH RETRIEVAL SCORING PROTOTYPE ===\x1b[0m\n');
  console.log(`\x1b[1mQuery:\x1b[0m "${query}"`);
  console.log(`\x1b[2mAdjust parameters using key controls below.\x1b[0m\n`);

  // Print parameter states
  console.log(`\x1b[1mParameters:\x1b[0m`);
  console.log(`  Linear Sim Weight (w):  \x1b[36m${state.weight.toFixed(2)}\x1b[0m  \x1b[2m(w for Sim, 1-w for Importance)\x1b[0m`);
  console.log(`  Exp Boost Factor (b):   \x1b[36m${state.boostFactor.toFixed(2)}\x1b[0m  \x1b[2m(Multiplier = b^(Imp - 3))\x1b[0m`);
  console.log(`  Linear Boost (alpha):   \x1b[36m${state.alpha.toFixed(2)}\x1b[0m  \x1b[2m(Multiplier = 1 + alpha*(Imp - 3))\x1b[0m`);
  console.log('\n' + '='.repeat(80) + '\n');

  // Compute results for each strategy
  const resultsLinear = DATASET.map(item => scoreLinear(item, query, state.weight))
    .sort((a, b) => b.hybridScore - a.hybridScore);

  const resultsMultiplicative = DATASET.map(item => scoreMultiplicative(item, query, state.boostFactor))
    .sort((a, b) => b.hybridScore - a.hybridScore);

  const resultsLinearBoost = DATASET.map(item => scoreLinearBoost(item, query, state.alpha))
    .sort((a, b) => b.hybridScore - a.hybridScore);

  // Render them in columns or clean blocks
  console.log('\x1b[1m1. LINEAR INTERPOLATION RANKING\x1b[0m \x1b[2m(Score = w*Sim + (1-w)*NormImp)\x1b[0m');
  printRankedList(resultsLinear);
  
  console.log('\x1b[1m2. EXPONENTIAL BOOST RANKING\x1b[0m \x1b[2m(Score = Sim * b^(Imp-3))\x1b[0m');
  printRankedList(resultsMultiplicative);

  console.log('\x1b[1m3. LINEAR BOOST RANKING\x1b[0m \x1b[2m(Score = Sim * (1 + alpha*(Imp-3)))\x1b[0m');
  printRankedList(resultsLinearBoost);

  // Print controls
  console.log('='.repeat(80));
  console.log('\x1b[1mControls:\x1b[0m');
  console.log(`  \x1b[1m[1 / 2 / 3]\x1b[0m Select Query  |  \x1b[1m[q]\x1b[0m Exit Prototype`);
  console.log(`  \x1b[1m[w / s]\x1b[0m Increase/Decrease Linear Weight (w) by 0.05`);
  console.log(`  \x1b[1m[e / d]\x1b[0m Increase/Decrease Exp Boost Factor (b) by 0.05`);
  console.log(`  \x1b[1m[r / f]\x1b[0m Increase/Decrease Linear Boost (alpha) by 0.05`);
}

function printRankedList(results: ScoredResult[]) {
  results.forEach((res, index) => {
    const impStr = '★'.repeat(res.item.importance) + '☆'.repeat(5 - res.item.importance);
    const contentTrunc = res.item.content.length > 50 
      ? res.item.content.slice(0, 47) + '...' 
      : res.item.content.padEnd(50);
    
    console.log(
      `  ${index + 1}. \x1b[32m[Score: ${res.hybridScore.toFixed(3)}]\x1b[0m ` +
      `Sim: ${res.similarity.toFixed(2)} | Imp: ${res.item.importance} (${impStr}) | ` +
      `"${contentTrunc}"`
    );
  });
  console.log();
}

// Setup stdin raw mode for key listening
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on('keypress', (str, key) => {
  if (key && (key.name === 'q' || (key.ctrl && key.name === 'c'))) {
    process.exit();
  }

  // Query selection
  if (str === '1') state.currentQueryIndex = 0;
  if (str === '2') state.currentQueryIndex = 1;
  if (str === '3') state.currentQueryIndex = 2;

  // w/s: Linear weight
  if (key && key.name === 'w') state.weight = Math.min(1.0, state.weight + 0.05);
  if (key && key.name === 's') state.weight = Math.max(0.0, state.weight - 0.05);

  // e/d: Exponential boost factor
  if (key && key.name === 'e') state.boostFactor = Math.min(3.0, state.boostFactor + 0.05);
  if (key && key.name === 'd') state.boostFactor = Math.max(1.0, state.boostFactor - 0.05);

  // r/f: Linear boost alpha
  if (key && key.name === 'r') state.alpha = Math.min(1.0, state.alpha + 0.05);
  if (key && key.name === 'f') state.alpha = Math.max(0.0, state.alpha - 0.05);

  renderFrame();
});

// Start the TUI
renderFrame();
