import subprocess

learning_text = (
    "Discovered that Google AI Studio enforces a strict 20 requests per day (RPD) hard cap on free tier API keys "
    "(quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier, limit: 20) across all Gemini models. Running a "
    "full 589-query benchmark suite with live LLM calls on a free Gemini key exhausts the daily quota after 20 queries, "
    "causing HTTP 429 RESOURCE_EXHAUSTED errors. To run full multi-hundred query benchmarks, an API key with billing enabled "
    "or a high-quota free provider like Groq (14,400 RPD) must be configured in .env."
)

cmd = [
    "neuron", "learn", "add", learning_text,
    "--tags", "failure-fix,gemini,api-quota,omb-run",
    "--importance", "4"
]
subprocess.run(cmd, check=True)
print("Successfully recorded learning entry.")
