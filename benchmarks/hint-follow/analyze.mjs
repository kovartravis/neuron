#!/usr/bin/env node
/**
 * Ticket 07 (neuron-2.4.0): joins `hint-events.jsonl`'s two independent event
 * streams — `fired` (the discovery-command hint injected this turn, ticket
 * 06) and `query-run` (a `Bash` tool call matched `neuron memory query`,
 * recorded by the `post-tool-use` measurement hook wired by hand into this
 * repo's own `.claude/settings.json`) — and reports how often a fired hint
 * is actually followed.
 *
 * Zero-cost, passive instrumentation: every real Claude Code session in this
 * repo (including wayfinder/dev sessions) contributes rows for free, no
 * synthetic harness, no API spend. See the map's "Not yet specified" fog for
 * the outcome-quality half of ticket 07's question, which this script does
 * not answer — a fired-but-unfollowed hint says nothing about whether
 * following it would have helped, only whether the agent chose to.
 *
 * A "follow" is join-by-session: a `query-run` row in the same session whose
 * command exactly matches a still-unmatched `fired` row's command, at any
 * later timestamp — not windowed to "the very next tool call," since a Bash
 * matcher fires on every tool call in the session and neuron has no
 * transcript-order signal beyond the timestamp each event was recorded at.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import envPaths from 'env-paths';

function projectHash(projectRoot) {
  return crypto.createHash('sha256').update(path.resolve(projectRoot)).digest('hex').slice(0, 16);
}

function hookCacheDir(projectRoot) {
  const override = process.env.NEURON_HOOK_CACHE_DIR;
  const base = override && override.trim() ? override.trim() : path.join(envPaths('neuron', { suffix: '' }).cache, 'hooks');
  return path.join(base, projectHash(projectRoot));
}

function readEvents(projectRoot) {
  const filePath = path.join(hookCacheDir(projectRoot), 'hint-events.jsonl');
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(l => l.length > 0)
    .map(l => JSON.parse(l));
}

function analyze(events) {
  const fires = events.filter(e => e.type === 'fired');
  const runs = events.filter(e => e.type === 'query-run');

  const followedFires = [];
  const unfollowedFires = [];
  const consumedRunIndexes = new Set();

  for (const fire of fires) {
    const matchIdx = runs.findIndex(
      (run, idx) =>
        !consumedRunIndexes.has(idx) &&
        run.sessionId === fire.sessionId &&
        run.command === fire.command &&
        run.at >= fire.at
    );
    if (matchIdx === -1) {
      unfollowedFires.push(fire);
    } else {
      consumedRunIndexes.add(matchIdx);
      const latencyMs = new Date(runs[matchIdx].at).getTime() - new Date(fire.at).getTime();
      followedFires.push({ fire, run: runs[matchIdx], latencyMs });
    }
  }

  const latencies = followedFires.map(f => f.latencyMs).sort((a, b) => a - b);
  const medianLatencyMs = latencies.length ? latencies[Math.floor(latencies.length / 2)] : null;

  return {
    totalFires: fires.length,
    totalQueryRuns: runs.length,
    followed: followedFires.length,
    unfollowed: unfollowedFires.length,
    followRate: fires.length ? followedFires.length / fires.length : null,
    medianLatencyMs,
    sessionsWithAFire: new Set(fires.map(f => f.sessionId)).size,
  };
}

function main() {
  const projectRoot = process.argv[2] || process.cwd();
  const events = readEvents(projectRoot);
  if (events.length === 0) {
    console.log(`No hint-follow events recorded yet for ${projectRoot}.`);
    console.log('This is a passive instrument — it fills in as real Claude Code sessions run against this repo.');
    return;
  }
  const summary = analyze(events);
  console.log(`Hint-follow summary for ${projectRoot}`);
  console.log('='.repeat(60));
  console.log(`Sessions that saw at least one fired hint: ${summary.sessionsWithAFire}`);
  console.log(`Hints fired:                               ${summary.totalFires}`);
  console.log(`neuron memory query Bash calls seen:       ${summary.totalQueryRuns}`);
  console.log(`Fired hints later followed:                ${summary.followed}`);
  console.log(`Fired hints never followed:                ${summary.unfollowed}`);
  console.log(
    `Follow rate:                               ${summary.followRate === null ? 'n/a' : `${(summary.followRate * 100).toFixed(1)}%`}`
  );
  console.log(`Median time-to-follow:                     ${summary.medianLatencyMs === null ? 'n/a' : `${summary.medianLatencyMs}ms`}`);
}

main();
