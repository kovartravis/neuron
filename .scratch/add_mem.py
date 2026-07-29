import subprocess

text = (
    "Discovered that Agent Memory Benchmark _save method in runner.py calculates overall accuracy "
    "by averaging r.score over merged query results if any result has a non-None score. "
    "Initial synthetic test files generated with score=1.0 poisoned subsequent omb run evaluations "
    "when results were merged by query_id. Deleting old synthetic outputs and re-indexing clean "
    "Gemini-evaluated query results with score=None correctly calculates accuracy as correct / total (75.0%)."
)

cmd = ["neuron", "learn", "add", text, "--tags", "benchmark,omb,accuracy-fix", "--importance", "5"]
subprocess.run(cmd, check=True)
print("Successfully logged learning.")
