#!/usr/bin/env python3
"""
Score A1 (recoverability binary) and A2 (recalibrated 1-5 scale) against
ground truth, using the raw model outputs in exp1_raw.json. Prunability
threshold is importance <= 2 for both arms (A1 maps recoverable->2,
unrecoverable->4; A2's exemplars define 1-2 as prunable), matching the
maxImportance: 2 example in ticket 23's config.
"""
import json

import os
SCRATCH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # benchmarks/pruning-ab/
MAX_PRUNE_IMPORTANCE = 2

def score_arm(raw_results, labels_by_id, arm_key):
    tp = fp = tn = fn = 0
    parse_failures = 0
    false_deletes = []  # ground truth unrecoverable, predicted prunable
    latencies = []
    n = 0
    for r in raw_results:
        label = labels_by_id[r['id']]
        gt_prunable = label['recoverable']  # ground truth: safe to prune
        arm = r[arm_key]
        latencies.append(arm['ms'])
        importance = arm['importance']
        if importance is None:
            parse_failures += 1
            continue
        n += 1
        pred_prunable = importance <= MAX_PRUNE_IMPORTANCE
        if pred_prunable and gt_prunable:
            tp += 1
        elif pred_prunable and not gt_prunable:
            fp += 1
            false_deletes.append({'id': r['id'], 'category': r['category'],
                                   'importance_predicted': importance})
        elif not pred_prunable and not gt_prunable:
            tn += 1
        else:
            fn += 1

    total_scored = tp + fp + tn + fn
    accuracy = (tp + tn) / total_scored if total_scored else None
    precision = tp / (tp + fp) if (tp + fp) else None  # of predicted-prunable, how many truly were
    recall = tp / (tp + fn) if (tp + fn) else None      # of truly-prunable, how many were caught
    n_unrecoverable_total = sum(1 for l in labels_by_id.values() if not l['recoverable'])
    false_delete_rate = len(false_deletes) / n_unrecoverable_total if n_unrecoverable_total else None

    latencies.sort()
    p50 = latencies[len(latencies)//2] if latencies else None
    p95 = latencies[int(len(latencies)*0.95)-1] if latencies else None

    return {
        'n_scored': total_scored,
        'parse_failures': parse_failures,
        'parse_failure_rate': round(parse_failures / len(raw_results), 4),
        'accuracy': round(accuracy, 4) if accuracy is not None else None,
        'precision_prunable': round(precision, 4) if precision is not None else None,
        'recall_prunable': round(recall, 4) if recall is not None else None,
        'confusion': {'tp': tp, 'fp': fp, 'tn': tn, 'fn': fn},
        'false_deletes_on_unrecoverable': false_deletes,
        'false_delete_count': len(false_deletes),
        'false_delete_rate_of_unrecoverable_set': round(false_delete_rate, 4) if false_delete_rate is not None else None,
        'disqualified': len(false_deletes) > 0,
        'latency_ms': {'p50': p50, 'p95': p95, 'mean': round(sum(latencies)/len(latencies), 1) if latencies else None},
    }

def main():
    raw = json.load(open(f"{SCRATCH}/exp1_raw.json"))
    label_data = json.load(open(f"{SCRATCH}/labels.json"))
    labels_by_id = {l['id']: l for l in label_data['labels']}

    a1 = score_arm(raw, labels_by_id, 'a1')
    a2 = score_arm(raw, labels_by_id, 'a2')

    if a1['disqualified'] and a2['disqualified']:
        winner = None
        verdict = 'both_disqualified'
    elif a1['disqualified']:
        winner = 'a2'
        verdict = 'a2_wins_a1_disqualified'
    elif a2['disqualified']:
        winner = 'a1'
        verdict = 'a1_wins_a2_disqualified'
    else:
        # Neither disqualified: higher accuracy wins; tie -> lower parse-failure rate.
        if a1['accuracy'] == a2['accuracy']:
            winner = 'a1' if a1['parse_failure_rate'] <= a2['parse_failure_rate'] else 'a2'
        else:
            winner = 'a1' if (a1['accuracy'] or 0) > (a2['accuracy'] or 0) else 'a2'
        verdict = f'{winner}_wins_on_accuracy'

    out = {
        'max_prune_importance_threshold': MAX_PRUNE_IMPORTANCE,
        'n_total_labels': len(raw),
        'a1_recoverability_binary': a1,
        'a2_recalibrated_scale': a2,
        'winner': winner,
        'verdict': verdict,
    }
    with open(f"{SCRATCH}/results-exp1.json", 'w') as f:
        json.dump(out, f, indent=2)

    print(json.dumps({k: v for k, v in out.items() if k not in ('a1_recoverability_binary', 'a2_recalibrated_scale')}, indent=2))
    print("\n--- A1 (recoverability binary) ---")
    print(json.dumps({k: v for k, v in a1.items() if k != 'false_deletes_on_unrecoverable'}, indent=2))
    print("\n--- A2 (recalibrated 1-5 scale) ---")
    print(json.dumps({k: v for k, v in a2.items() if k != 'false_deletes_on_unrecoverable'}, indent=2))
    if a1['false_deletes_on_unrecoverable']:
        print("\nA1 false-deletes:", json.dumps(a1['false_deletes_on_unrecoverable'], indent=2))
    if a2['false_deletes_on_unrecoverable']:
        print("\nA2 false-deletes:", json.dumps(a2['false_deletes_on_unrecoverable'], indent=2))

if __name__ == '__main__':
    main()
