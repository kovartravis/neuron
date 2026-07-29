# Category: learning

---
id: 4a513a07-ec57-49fd-b887-629ba8dbde42
createdAt: 2026-07-24T12:46:13.408Z
importance: 3
tags:
  - node
  - sqlite
  - termux
scope: neuron
taskId: null
---
Always use node:sqlite fallback for cross-platform support

---
id: 7fa5725f-1b4b-4082-9912-f28f977229e9
createdAt: 2026-07-24T12:51:23.441Z
importance: 3
tags:
  - sqlite
  - termux
  - cross-platform
scope: neuron
taskId: null
---
Neuron uses built-in node:sqlite fallback when better-sqlite3 native bindings are unavailable on Android/Termux

---
id: 4871f1e4-6ddb-4b1c-ac38-b1c462e95deb
createdAt: 2026-07-25T02:19:32.607Z
importance: 3
tags:
  - sqlite
  - termux
  - cross-platform
scope: neuron
taskId: null
---
When using node:sqlite DatabaseSync fallback, ensure fs.mkdirSync creates parent directories and PRAGMAs are executed safely

---
id: b2fd830f-9023-4045-a08d-40d738834151
createdAt: 2026-07-25T02:51:38.064Z
importance: 3
tags:
  - issue-tracker
  - convention
scope: neuron
taskId: null
---
Local issues live in .scratch/<feature-slug>/issues/NN-<slug>.md and are mapped in .scratch/<feature-slug>/map.md

---
id: 26b38d2c-5504-430f-9528-a1c8dc4d65d8
createdAt: 2026-07-25T02:59:11.233Z
importance: 3
tags:
  - architecture
  - typescript
scope: neuron
taskId: null
---
Keep domain models in src/models/ and re-export them from src/index.ts for backward compatibility

---
id: ec3bb1c4-55f3-4939-94bb-9affca94bdcb
createdAt: 2026-07-25T03:04:19.489Z
importance: 3
tags:
  - architecture
  - components
scope: neuron
taskId: null
---
Organize domain entities and runtime logic under src/components/ directory

---
id: bf88ae5a-265a-4d48-8d04-3a24edfc5ec0
createdAt: 2026-07-25T03:13:51.440Z
importance: 3
tags:
  - testing
  - convention
scope: neuron
taskId: null
---
Every component file under src/components/ must have a corresponding <component>.test.ts unit test file

---
id: 29de3732-2534-418b-927e-69d575f503ba
createdAt: 2026-07-28T02:21:23.079Z
importance: 4
tags:
  - failure-fix
  - termux
  - shebang
scope: neuron
taskId: null
---
Fix for exit code 126 when executing neuron CLI in Termux environment: Running neuron failed with 'bash: /data/data/com.termux/files/usr/bin/neuron: /usr/bin/env: bad interpreter: No such file or directory'. The root cause is that standard Linux shebangs reference /usr/bin/env, which does not exist in Termux's standard file structure (/data/data/com.termux/files/usr/bin/env). The issue was resolved by running 'termux-fix-shebang /data/data/com.termux/files/usr/bin/neuron' to rewrite the shebang path to point to the correct Termux path. If additional binaries or scripts exhibit this behavior on Termux, termux-fix-shebang should be applied or node should be invoked directly.

---
id: 4c28c08a-de83-4c26-9460-5f672c5beaaa
createdAt: 2026-07-28T02:24:16.465Z
importance: 4
tags:
  - failure-fix
  - termux
  - shebang
  - build
scope: neuron
taskId: null
---
Fix for exit code 126 on globally linked neuron CLI dist/cli.js in Termux: Rebuilding TypeScript via npm run build or tsc regenerates dist/cli.js with standard #!/usr/bin/env node shebangs, which overwrites the binary linked in /data/data/com.termux/files/usr/lib/node_modules/@kovartravis/neuron/dist/cli.js. In Termux environments, /usr/bin/env is missing, resulting in exit code 126. The issue is resolved by running termux-fix-shebang on the globally installed dist/cli.js file. To prevent recurrence after future builds, termux-fix-shebang should be executed whenever dist/cli.js is rebuilt.

---
id: 19367ee1-8640-4591-979d-e11b9debe2d3
createdAt: 2026-07-29T12:17:45.292Z
importance: 4
tags:
  - md-storage
  - test
scope: neuron
taskId: null
---
Markdown

---
id: 567edbf1-6ca0-47ed-aa03-db312deea40d
createdAt: 2026-07-29T12:38:26.883Z
importance: 4
tags:
  - vitest
  - test
scope: project
taskId: null
---
Vitest test runner requires --runInBand

---
id: 4a7734c5-5eba-4f2b-b751-23105db380cb
createdAt: 2026-07-29T12:38:27.706Z
importance: 3
tags:
  - test
  - tdd
scope: project
taskId: null
---
Always test first

---
id: 3f4f7380-b8fe-428b-b359-531f83294e87
createdAt: 2026-07-29T12:38:40.595Z
importance: 5
tags:
  - design
scope: custom-scope
taskId: null
---
Important design rule

---
id: 2443cd4e-96b6-4442-9fda-7b862383d15d
createdAt: 2026-07-29T12:38:41.604Z
importance: 5
tags:
  - updated
scope: updated-scope
taskId: null
---
Updated learning content

---
id: f29bdaa4-c022-44fb-8b08-8ffde4cf2f34
createdAt: 2026-07-29T12:38:49.871Z
importance: 4
tags:
  - failure-fix
  - build
scope: project
taskId: null
---
Fix for build error: pass --no-cache to avoid stale artifacts
