const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Small runtime loader for the repository's TypeScript maintenance scripts.
// It uses the TypeScript compiler already installed by npm ci and avoids a
// second runtime dependency just to execute one-off workers.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const entry = process.argv[2];
if (!entry) throw new Error('Usage: node scripts/run-typescript.cjs <typescript-entrypoint>');
const entryPath = path.resolve(process.cwd(), entry);
process.argv = [process.argv[0], entryPath, ...process.argv.slice(3)];
require(entryPath);
