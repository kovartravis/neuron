#!/usr/bin/env python3
"""
Filter query_logs.json down to genuinely semantic query fragments for
Experiment 2. The plan warns query_logs is mostly `neuron exec`-captured
command strings, not real queries: 542/795 were command strings at the time
the plan was written. This filter is content-based (command syntax +
shell/CLI vocabulary + length), not a single command-prefix regex, per the
plan's explicit instruction to filter "with more care than a command-prefix
regex" and to report the surviving count.
"""
import json, re

import os
SCRATCH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .scratch/configurable-pruning/

CLI_TOKEN_RE = re.compile(
    r'(^|\s)(--[a-zA-Z][\w-]*|neuron\s+(memory|exec|scan|sync|init|status|ui)|'
    r'git\s+(push|pull|commit|tag|status|diff|log|add|checkout|clone)|'
    r'npm\s+(run|test|publish|install|version)|npx|vitest|tsx\s|node\s+|python3?\s|'
    r'uv\s+(run|sync)|gh\s+(pr|repo|issue)|sqlite3\s|curl\s|chmod\s|mkdir\s|rm\s+-rf|'
    r'cd\s+/|\.\/dist\/|\$\(|&&|\|\||'
    r'\.(py|mjs|sh)\b|^/usr/|^/bin/|^/opt/)',
    re.IGNORECASE,
)
# Command strings captured by `neuron exec` are the *entire* shell command,
# often long with punctuation typical of code/paths, not prose.
PATH_OR_FLAG_HEAVY_RE = re.compile(r'[/\\]{1}\S*[/\\]|--\w')

def looks_like_command(text: str) -> bool:
    if CLI_TOKEN_RE.search(text):
        return True
    # neuron memory add/history/learn full-sentence captures: identifiable by
    # containing a CLI flag anywhere plus being long (a real query is terse).
    if len(text) > 120 and PATH_OR_FLAG_HEAVY_RE.search(text):
        return True
    return False

def word_count(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9']+", text))

def main():
    logs = json.load(open(f"{SCRATCH}/query_logs.json"))
    kept, dropped_command, dropped_short = [], [], []
    for row in logs:
        text = row['query_text']
        if looks_like_command(text):
            dropped_command.append(row)
            continue
        if word_count(text) <= 2:
            dropped_short.append(row)
            continue
        kept.append(row)

    print(f"total query_logs: {len(logs)}")
    print(f"dropped as command strings: {len(dropped_command)}")
    print(f"dropped as <=2 words: {len(dropped_short)}")
    print(f"surviving semantic queries: {len(kept)}")

    # De-duplicate identical repeated queries (keep first occurrence) since a
    # paired retrieval comparison gains nothing from scoring the same string
    #20 times; report both counts.
    seen = set()
    deduped = []
    for row in kept:
        key = row['query_text'].strip().lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(row)
    print(f"surviving after de-duplication: {len(deduped)}")

    with open(f"{SCRATCH}/filtered_queries.json", 'w') as f:
        json.dump(deduped, f, indent=2)
    with open(f"{SCRATCH}/filtered_queries_sample.txt", 'w') as f:
        for row in deduped:
            f.write(row['query_text'] + '\n')

if __name__ == '__main__':
    main()
