import subprocess

decision_text = (
    "Implemented Zod schema validation for neuron.yaml configuration in src/config/neuronYaml.ts (replacing neuronrc naming). "
    "Configured storage.mode schema to support vector-only, md-only, dual, and split modes, defaulting storage.path to .neuron "
    "for flat Markdown storage inside project repositories. All 63 unit tests passed across 13 test files."
)

cmd1 = ["neuron", "memory", "add", "--category", "decisions", decision_text, "--tags", "adr,config,zod,storage-mode"]
subprocess.run(cmd1, check=True)

history_text = (
    "Completed ticket 01-neuronrc-config-schema-parser: Added Zod schema validation for neuron.yaml / neuron.yml files in "
    "src/config/neuronYaml.ts. Replaced neuronrc naming completely, added storage.mode ('vector-only' | 'md-only' | 'dual' | 'split') "
    "and storage.path ('.neuron') options, and added unit tests in src/config/neuronYaml.test.ts. All 63 unit tests passed cleanly."
)

cmd2 = ["neuron", "history", "add", history_text, "--tags", "config,neuronYaml,zod", "--task-id", "01-neuronrc-config-schema-parser"]
subprocess.run(cmd2, check=True)

print("Successfully recorded decision and history entries.")
