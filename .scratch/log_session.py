import subprocess

text = (
    "Launched full 589-query Agent Memory Benchmark evaluation for Neuron on personamem/32k dataset "
    "using Gemini 2.5 Flash Lite under free tier rate limits. The run executes in the background, "
    "automatically managing 15 RPM backoff pauses, and will auto-compress and update results-manifest.json upon completion."
)

cmd = ["neuron", "history", "add", text, "--tags", "benchmark,omb,full-run"]
subprocess.run(cmd, check=True)
print("Successfully logged session history.")
