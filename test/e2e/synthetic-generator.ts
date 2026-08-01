import fs from 'node:fs';
import path from 'node:path';

export interface SyntheticGeneratorOptions {
  moduleCount?: number;
  filesPerModule?: number;
  memoryCount?: number;
}

export function generateSyntheticPolyglotWorkspace(
  targetDir: string,
  options: SyntheticGeneratorOptions = {}
): { totalFiles: number; totalMemories: number } {
  const moduleCount = options.moduleCount ?? 20;
  const filesPerModule = options.filesPerModule ?? 25;
  const memoryCount = options.memoryCount ?? 500;

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  // 1. Root manifests & neuron.yaml
  fs.writeFileSync(
    path.join(targetDir, 'package.json'),
    JSON.stringify(
      {
        name: 'synthetic-polyglot-workspace',
        version: '2.1.0',
        dependencies: { express: '^4.19.2', zod: '^3.23.8', lodash: '^4.17.21' },
        devDependencies: { typescript: '^5.4.5', vitest: '^1.6.0' },
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(targetDir, 'neuron.yaml'),
    `version: "1.0"\nstorage:\n  mode: dual\n  path: .neuron\ncategories:\n  learning:\n    description: Learnings\n  history:\n    description: Action history\n  decisions:\n    description: Architectural decisions\n  architecture:\n    description: Architectural blueprints\nscan:\n  enabled: true\n  category: architecture\n  depth: 4\n`
  );

  let createdFiles = 2;

  // 2. Generate modules & multi-language files
  const extensions = ['ts', 'py', 'go', 'rs', 'java', 'cpp'];
  for (let m = 1; m <= moduleCount; m++) {
    const modName = `module_${String(m).padStart(3, '0')}`;
    const modDir = path.join(targetDir, 'packages', modName, 'src');
    fs.mkdirSync(modDir, { recursive: true });

    for (let f = 1; f <= filesPerModule; f++) {
      const ext = extensions[(m + f) % extensions.length];
      const fileName = `component_${String(f).padStart(3, '0')}.${ext}`;
      const filePath = path.join(modDir, fileName);

      let content = '';
      if (ext === 'ts') {
        content = `export class SyntheticClass${m}_${f} {\n  public executeTask(): string {\n    return "synthetic_result_${m}_${f}";\n  }\n}\nexport function computeData${m}_${f}(input: number): number {\n  return input * ${f};\n}\n`;
      } else if (ext === 'py') {
        content = `class SyntheticPyService${m}_${f}:\n    def process(self, data: dict) -> dict:\n        return {"status": "ok", "id": ${f}}\n\ndef py_utility_${m}_${f}(val: int) -> int:\n    return val + ${f}\n`;
      } else if (ext === 'go') {
        content = `package main\n\ntype SyntheticGoPipeline${m}_${f} struct {\n\tID int\n}\n\nfunc ProcessGoStream${m}_${f}(val int) int {\n\treturn val * ${f}\n}\n`;
      } else if (ext === 'rs') {
        content = `pub struct SyntheticRustVault${m}_${f} {\n    pub key: String,\n}\n\npub fn verify_rust_token_${m}_${f}(token: &str) -> bool {\n    !token.is_empty()\n}\n`;
      } else if (ext === 'java') {
        content = `public class SyntheticJavaManager${m}_${f} {\n    public int processBatch(int count) {\n        return count * ${f};\n    }\n}\n`;
      } else {
        content = `#include <iostream>\n\nclass SyntheticCppEngine${m}_${f} {\npublic:\n    void run() {\n        std::cout << "Engine ${m}_${f}" << std::endl;\n    }\n};\n`;
      }

      fs.writeFileSync(filePath, content, 'utf8');
      createdFiles++;
    }
  }

  // 3. Extended-language corner.
  //
  // Kept deliberately small and separate from the numbered modules above: the
  // summarizer caches per file content, so changing the main module extensions
  // would invalidate every cached entry and force a ~13-minute cold re-scan.
  // These few files are enough to prove the traversal filter covers every
  // language the parser supports, not just the JS/TS/Go/Rust/Java/C++ core.
  const extendedDir = path.join(targetDir, 'packages', 'polyglot_extras', 'src');
  fs.mkdirSync(extendedDir, { recursive: true });

  const extendedSamples: Record<string, string> = {
    'Widget.tsx': 'export class ReactWidget {\n  render() { return null; }\n}\nexport function useWidget() { return 1; }\n',
    'legacy.jsx': 'export class LegacyWidget {\n  render() { return null; }\n}\n',
    'Service.cs': 'public class CsharpService {\n  public int Process(int n) { return n; }\n}\n',
    'Model.swift': 'class SwiftModel {\n  func process(v: Int) -> Int { return v }\n}\n',
    'helper.rb': 'class RubyHelper\n  def process(v)\n    v\n  end\nend\n',
    'Handler.php': '<?php\nclass PhpHandler {\n  public function process($v) { return $v; }\n}\n',
    'engine.hpp': 'class CppHeaderEngine {\npublic:\n  int process(int v);\n};\n',
  };

  for (const [name, content] of Object.entries(extendedSamples)) {
    fs.writeFileSync(path.join(extendedDir, name), content, 'utf8');
    createdFiles++;
  }

  return { totalFiles: createdFiles, totalMemories: memoryCount };
}
