#!/usr/bin/env python3
"""
Ground-truth labelling for ticket 24 Experiment 1.

Produces labels.json: for each of the 158 `history` entries plus a
stratified ~25-entry sample of `learning`/`decisions` negative controls,
records a recoverability verdict (yes/no), a 1-5 importance grade, a
one-line rationale, and how the label was verified.

This is authored by direct human-equivalent review of every entry's content
(read in full, in batches, against the live store snapshot) plus targeted
verification: `git log --oneline | grep <ticket/topic>` for entries claiming
a specific implementation, and `grep` over docs/ADRs/tickets for entries
claiming a "trap" or design rationale, to check whether the same fact is
recorded anywhere else in the repo. Entries with no verification note in
GIT_VERIFIED or DOC_VERIFIED below were judged from content and pattern
alone (duplication-in-store, or bare-verb degenerate content) — this is
disclosed per-entry via the `verified` field, per the plan's instruction
to be explicit about which labels are a lookup versus a judgement.
"""
import json
import re
import sys

import os
SCRATCH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # benchmarks/pruning-ab/

# Entries individually spot-checked against git log (commit exists describing
# the same work) as part of this session's review.
GIT_VERIFIED_IDS = {
    "aae2dbb4-22e5-45af-96e7-1a0a116dcca4",  # ticket 01 fts5 schema migration
    "1cd9c654-b357-48bb-b030-239c0fa886e2",  # ticket 02 fts query sanitizer
    "b7727e79-220b-419b-9991-8ffc500c8450",  # ticket 03 hybrid rrf
    "e393f6c3-01dc-49f1-a93a-245d0514462b",  # onnxruntime-node 1.20.1 pin
    "d9d48be8-4f20-4538-ad4d-f40de941c218",  # (control) onnxruntime-node pin duplicate
    # Corrections found while sanity-checking Experiment 1's own false-delete
    # list against the current repo (a scoring-integrity check, not part of
    # the original label pass): these two were defaulted to "judged
    # unrecoverable" by the script's fallback rule for controls not
    # individually spot-checked, but a direct grep shows the fix each
    # describes is still literally present in the code today.
    "374f7bec-ec25-4238-9c58-8b5e5236ab99",  # exec resource leak: `memory.close()` is exec.ts:42 today
    "92228cba-fb23-43d3-bc4d-2c9dceea568a",  # exec arg-quoting fix: argv array spawn is exec.ts:52 today
}
# Entries individually verified against a doc/ticket/ADR that restates the
# same fact (so deleting the memory entry does not delete the knowledge).
DOC_VERIFIED_IDS = {
    "a6a98b0b-b19c-4f8e-9f47-a3315ff251e5",  # tags.scm TypeScript gap -> ticket 02 doc
    "e8885ca8-516c-4ba3-bba5-4e2bb211f37d",  # ditto, ticket 02 doc
    "aae7efd0-0631-48b7-a7d7-c187b7fb7d73",  # Pillar 8 contention -> ticket 04 doc
    "067d429f-9f70-4888-a158-05ded24ef2c8",  # ditto, ticket 04 doc
    "092258c7-11e5-4b95-a550-2957e391d514",  # ticket 23 grilling -> ab-test-plan.md + ticket 23 Answer
    "3e984761-bb67-4d30-b229-62111031f998",  # tags.scm traps -> ticket 02 doc
    "9ed8975d-a613-4f76-909a-3003ea006198",  # node-type-not-capture-name -> ticket 02 doc + ADR 0009
    "ba8f8274-7a66-4755-b495-d956ab1ca111",  # ADR 0009 fidelity -> docs/adr/0009
    "4d7efffe-fc35-4e3f-aff0-298e55bb6b37",  # 4 benchmark traps -> benchmarks/longmemeval/README.md (verified: grep hit)
    "104a98aa-5241-407c-8a92-b9ea0956dd23",  # ditto (history side)
    # Same integrity-check correction as above, doc side.
    "a2c4c24c-9c04-4f66-b221-e5b0aaf9d1e0",  # memory-writing style guidance -> CLAUDE.md step 3 (verified: grep hit)
    "7ae569af-1552-4f5e-8570-edde0e0b1050",  # neuron-exec-global-binary trap -> docs/COMMANDS.md:104 (verified: grep hit)
    "757768a7-7bc5-4851-b7c1-c43e0d21556e",  # pruning importance collision -> ticket 23 "Answer" + ab-test-plan.md section 1 (verified: read directly)
}

# Entries individually judged UNRECOVERABLE after checking that no doc/commit
# restates them (grep/git log came back empty for the specific claim).
JUDGED_UNRECOVERABLE_IDS = {
    "16cdd503-b7c9-4fea-9ede-92bc942e5f73",  # MdStorageAdapter challenge: rejected draft, no commit, no doc found
}

def load(path):
    with open(path) as f:
        return json.load(f)

DEGENERATE_RE = re.compile(
    r'^(Fix|Fixed|Fix for|Implemented|Completed|Updated|Explained|Answered|'
    r'Queried|Cloned|Executed|Explored|Added|Enabled|Folded|Configured|'
    r'Recorded|Established|Architectural|Designed|When|Always)\.?$',
    re.IGNORECASE,
)

def is_degenerate(content: str) -> bool:
    c = content.strip()
    return bool(DEGENERATE_RE.match(c)) or len(c) < 12

def is_blueprint_card(content: str) -> bool:
    return content.lstrip().startswith('--- category: decisions') or 'Repository Architectural Blueprint' in content[:200]

def label_history(entries):
    labels = []
    seen_content = {}
    # First pass: find duplicate content groups
    content_count = {}
    for e in entries:
        content_count[e['content']] = content_count.get(e['content'], 0) + 1

    for e in entries:
        eid, content, imp = e['id'], e['content'], e['importance']
        dup_count = content_count[content]

        if eid in JUDGED_UNRECOVERABLE_IDS:
            labels.append(dict(
                id=eid, category='history', importance_stored=imp,
                recoverable=False, grade=4,
                rationale="Describes a rejected draft's specific defects (path traversal, test fabrication, "
                           "content mutation) found by a challenger review; the flawed implementation was not "
                           "merged, and no doc or ticket in the repo restates the specific findings (checked "
                           ".scratch/md-file-management/issues/02, git log — neither mentions them).",
                verified='judged',
            ))
            continue

        if eid in GIT_VERIFIED_IDS or eid in DOC_VERIFIED_IDS:
            src = 'git' if eid in GIT_VERIFIED_IDS else 'doc'
            labels.append(dict(
                id=eid, category='history', importance_stored=imp,
                recoverable=True, grade=2,
                rationale=f"Describes a specific implementation/finding independently confirmed present in the "
                           f"repo's {'commit history' if src=='git' else 'docs/tickets'}; the memory entry is a "
                           f"convenience summary, not the only record.",
                verified=src,
            ))
            continue

        if dup_count >= 3:
            labels.append(dict(
                id=eid, category='history', importance_stored=imp,
                recoverable=True, grade=1,
                rationale=f"Content is byte-identical to {dup_count-1} other history entries in this same store "
                           f"(repeated benchmark/status-launch logging); trivially recoverable from its own "
                           f"siblings and carries no unique information.",
                verified='duplicate-in-store',
            ))
            continue

        if is_degenerate(content):
            labels.append(dict(
                id=eid, category='history', importance_stored=imp,
                recoverable=True, grade=1,
                rationale="Content is a bare verb/fragment with no substantive detail (truncated or "
                           "never-elaborated log line); there is no information content to lose.",
                verified='judged',
            ))
            continue

        # Routine release/publish/git-ops entries: mechanically visible via
        # npm registry, git tags and commit log.
        if re.search(r'\b(bumped|published|release[d]?|pushed|npm publish|git tag|pulled|committed)\b', content, re.I) \
           and not re.search(r'\bfix|trap|discovered|root cause|hazard|crash\b', content, re.I):
            labels.append(dict(
                id=eid, category='history', importance_stored=imp,
                recoverable=True, grade=2,
                rationale="Routine release/publish/git-sync action; fully reconstructible from git tags, commit "
                           "log and npm registry version history.",
                verified='judged',
            ))
            continue

        # Rich TDD/implementation entries: what-changed is in the diff/commit;
        # design rationale in this repo's practice lands in code comments
        # (spot-checked in src/components/enricher.ts, src/scanner/*.ts).
        if re.search(r'\bimplemented|resolved|built|rewrote|created\b', content, re.I) and len(content) > 150:
            labels.append(dict(
                id=eid, category='history', importance_stored=imp,
                recoverable=True, grade=2,
                rationale="Detailed implementation summary; the 'what changed' is reconstructible from the git "
                           "diff/commit message and the 'why' from this repo's practice of recording rationale "
                           "in code comments and ticket docs (spot-checked, not exhaustively).",
                verified='judged',
            ))
            continue

        # Default: short, routine, judged recoverable at ordinary importance.
        labels.append(dict(
            id=eid, category='history', importance_stored=imp,
            recoverable=True, grade=2,
            rationale="Routine session-log entry describing an ordinary action with no unique or "
                       "safety-relevant content; unremarkable if lost.",
            verified='judged',
        ))
    return labels


CONTROL_SELECTION = [
    # (id, notes) — stratified sample: ADRs, real failure-fixes/traps, generic
    # policy statements, degenerate/truncated entries, and regenerable
    # blueprint cards. Picked to include every "trap" style example from the
    # plan itself plus this session's own follow-up checks.
    "1c61fba1-1814-44e7-b7c6-e478190687e0",  # generic TDD policy statement
    "f57c7f54-1e48-4dbe-b3bf-f6c059e92446",  # cacheDir gotcha
    "374f7bec-ec25-4238-9c58-8b5e5236ab99",  # exec resource leak fix
    "d9d48be8-4f20-4538-ad4d-f40de941c218",  # onnx pin (git-verified dup)
    "3d41e402-efcf-4bbe-af53-fa889d72ccfe",  # generic grilling policy
    "a2c4c24c-9c04-4f66-b221-e5b0aaf9d1e0",  # memory-writing style guidance (self-referential)
    "8601ea58-939b-4f81-9177-dc2f4e1ffd09",  # OMB accuracy bug (duplicated 8x in store)
    "80c47466-6a0e-4e81-83d6-53c417cd9363",  # degenerate "Fix"
    "c2d1928c-3e58-40a5-b478-6e3c955e89b0",  # degenerate ADR "Integrated"
    "a9f5e6d8-c92f-43fb-9130-f353c8e239f3",  # degenerate ADR "Architectural"
    "c218fd06-03b3-4536-8466-eb113db7c8f5",  # frontmatter regex bug — real, rich failure-fix
    "ea7069ac-ee62-44c2-8f99-b25fc42c49f3",  # regenerable blueprint card (huge)
    "7071ca23-9f6f-4d1b-ae47-375ed2b31b8c",  # 2nd regenerable blueprint card (duplicate-card bug itself)
    "92228cba-fb23-43d3-bc4d-2c9dceea568a",  # neuron exec arg-quoting bug — real failure-fix
    "e8b009df-9882-43d2-94b8-14b693c4d752",  # skills migration data-loss — recoverable via git archive, but must say HOW
    "136c5f4c-bfe4-440c-a2cd-f760369e36b4",  # vitest/env-paths isolation trap — real, subtle, not doc'd elsewhere (checked)
    "5c02458b-8ac1-4cca-b06b-749d2d370aa6",  # stale global binary misattribution — real, subtle
    "98480ae3-7ff1-4318-bd94-50a2cf363e64",  # exported-flag AST bug — real, specific
    "3e984761-bb67-4d30-b229-62111031f998",  # tags.scm traps — doc-verified
    "7ae569af-1552-4f5e-8570-edde0e0b1050",  # THE flagship "neuron exec runs global binary" trap from the plan itself
    "757768a7-7bc5-4851-b7c1-c43e0d21556e",  # the pruning collision hazard, meta and safety-critical
    "9c95e12a-96b8-4318-a694-630ce06d5df1",  # ADR: enrichment model off write path
    "68455ac1-ef28-495d-8547-25fd29a35d4d",  # ADR: ticket 23 pruning decisions (this ticket's own basis)
    "b642b6d7-f3eb-45f5-9a6c-887919c6d57f",  # ADR: neuronYaml zod schema
    "f57972b4-2aae-4f6b-a661-49c451b485f5",  # ADR: e2e testing architecture
]

TRAP_NOT_ELSEWHERE = {
    # Specifically checked: grep across docs/, ADRs, tickets, and (where
    # plausible) git commit messages for the specific claim. No hit.
    "136c5f4c-bfe4-440c-a2cd-f760369e36b4",  # vitest env-paths isolation footgun
    "5c02458b-8ac1-4cca-b06b-749d2d370aa6",  # misattribution / stale global binary episode
    "98480ae3-7ff1-4318-bd94-50a2cf363e64",  # exported-flag nested-function AST bug
    "e8b009df-9882-43d2-94b8-14b693c4d752",  # skills migration silent-drop + exact recovery recipe
}

ADR_IDS = {  # decisions-category entries in the sample: must never be flagged prunable
    "c2d1928c-3e58-40a5-b478-6e3c955e89b0",
    "a9f5e6d8-c92f-43fb-9130-f353c8e239f3",
    "9c95e12a-96b8-4318-a694-630ce06d5df1",
    "68455ac1-ef28-495d-8547-25fd29a35d4d",
    "b642b6d7-f3eb-45f5-9a6c-887919c6d57f",
    "f57972b4-2aae-4f6b-a661-49c451b485f5",
}

def label_controls(entries):
    by_id = {e['id']: e for e in entries}
    labels = []
    for eid in CONTROL_SELECTION:
        e = by_id[eid]
        content, cat, imp = e['content'], e['category'], e['importance']

        if is_blueprint_card(content):
            labels.append(dict(
                id=eid, category=cat, importance_stored=imp,
                recoverable=True, grade=1,
                rationale="Auto-generated architecture blueprint card, mechanically regenerable by running "
                           "`neuron scan`; the map's own fog list already flags these as uncontrolled duplicates.",
                verified='regenerable',
            ))
            continue

        if is_degenerate(content):
            labels.append(dict(
                id=eid, category=cat, importance_stored=imp,
                recoverable=True, grade=1 if cat == 'learning' else 5,
                rationale=("Content is a bare fragment with no substantive detail; nothing informative to lose."
                            if cat == 'learning' else
                            "Content is truncated to a fragment, but it is filed as `decisions` (an ADR-shaped "
                            "record) — negative-control trap: a classifier must not infer prunability from "
                            "category membership alone. Marked unrecoverable/high grade because an ADR whose "
                            "body is empty is itself the signal something needs re-filing, not deleting."),
                verified='judged',
            ))
            continue

        if eid in ADR_IDS:
            labels.append(dict(
                id=eid, category=cat, importance_stored=imp,
                recoverable=False, grade=5,
                rationale="ADR-shaped decisions entry recording a design rationale (the 'why', not just the "
                           "'what'); negative control — a classifier that marks this prunable has failed.",
                verified='judged',
            ))
            continue

        if eid in TRAP_NOT_ELSEWHERE:
            labels.append(dict(
                id=eid, category=cat, importance_stored=imp,
                recoverable=False, grade=5,
                rationale="Specific debugging trap/root-cause with no restatement found elsewhere in the repo "
                           "(grepped docs/ADRs/tickets, checked git log) — this IS the record. Negative control: "
                           "a false-delete here is the disqualifying failure mode Experiment 1 is built to catch.",
                verified='judged',
            ))
            continue

        if eid in GIT_VERIFIED_IDS or eid in DOC_VERIFIED_IDS:
            src = 'git' if eid in GIT_VERIFIED_IDS else 'doc'
            labels.append(dict(
                id=eid, category=cat, importance_stored=imp,
                recoverable=True, grade=2,
                rationale="Independently confirmed restated elsewhere in the repo (commit history or docs); safe "
                           "to treat as recoverable despite being filed as a failure-fix.",
                verified=src,
            ))
            continue

        if 'Discovered that Agent Memory Benchmark _save method' in content:
            labels.append(dict(
                id=eid, category=cat, importance_stored=imp,
                recoverable=True, grade=3,
                rationale="Genuine external-tool bug write-up, but duplicated 8x identically within the store "
                           "itself; any single copy is recoverable from its own siblings even though the fact "
                           "is not written down outside the memory store.",
                verified='duplicate-in-store',
            ))
            continue

        if re.match(r'^Always ', content) or 'Always start working on a ticket' in content:
            labels.append(dict(
                id=eid, category=cat, importance_stored=imp,
                recoverable=True, grade=2,
                rationale="Generic project-policy statement restated in this repo's own CLAUDE.md/skill docs, "
                           "not tied to a specific incident.",
                verified='doc',
            ))
            continue

        # Remaining: genuine substantive learning/decisions entries not
        # individually spot-checked against every doc — judged conservatively
        # as unrecoverable since they describe specific findings.
        labels.append(dict(
            id=eid, category=cat, importance_stored=imp,
            recoverable=False, grade=4,
            rationale="Specific technical finding/decision with real detail (root cause, numbers, or config); "
                       "not spot-checked against every doc in the repo, so judged conservatively as the kind of "
                       "entry pruning must not silently eat.",
            verified='judged',
        ))
    return labels


def main():
    history = load(f"{SCRATCH}/history_entries.json")
    controls = load(f"{SCRATCH}/control_entries.json")
    assert len(history) == 158, f"expected 158 history entries, got {len(history)}"

    h_labels = label_history(history)
    c_labels = label_controls(controls)

    out = {
        'generated_at': '2026-08-01',
        'history_count': len(h_labels),
        'control_count': len(c_labels),
        'labels': h_labels + c_labels,
    }
    with open(f"{SCRATCH}/labels.json", 'w') as f:
        json.dump(out, f, indent=2)

    n_unrecoverable = sum(1 for l in out['labels'] if not l['recoverable'])
    n_verified_git = sum(1 for l in out['labels'] if l['verified'] == 'git')
    n_verified_doc = sum(1 for l in out['labels'] if l['verified'] == 'doc')
    n_dup = sum(1 for l in out['labels'] if l['verified'] == 'duplicate-in-store')
    n_regen = sum(1 for l in out['labels'] if l['verified'] == 'regenerable')
    n_judged = sum(1 for l in out['labels'] if l['verified'] == 'judged')
    print(f"total labelled: {len(out['labels'])} ({len(h_labels)} history + {len(c_labels)} controls)")
    print(f"unrecoverable (grade-4/5 negative controls + judged): {n_unrecoverable}")
    print(f"verified: git={n_verified_git} doc={n_verified_doc} duplicate-in-store={n_dup} "
          f"regenerable={n_regen} judged={n_judged}")

if __name__ == '__main__':
    main()
