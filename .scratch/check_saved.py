import json
from pathlib import Path

p = Path("benchmarks/agent-memory-benchmark/outputs/personamem/neuron/rag/32k.json")
if p.exists():
    d = json.loads(p.read_text())
    print(f"Total queries evaluated & saved: {d.get('total_queries')}")
    print(f"Correct queries: {d.get('correct')}")
    print(f"Accuracy: {d.get('accuracy'):.1%}")
else:
    print("Output file does not exist yet.")
