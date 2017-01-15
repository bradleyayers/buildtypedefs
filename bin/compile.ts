import { readFileSync } from 'fs';
import { compile } from '../src/compile';
import { usage } from 'yargs';

const { argv } = usage('Usage: $0 [file..]').help();
let hasEmittedAnything = false;

for (const filePath of argv._) {
  const fileContent = readFileSync(filePath, 'utf8');
  const compiled = compile(fileContent);
  if (compiled.length === 0) {
    continue
  }
  if (hasEmittedAnything) {
    process.stdout.write('\n\n');
  }
  process.stdout.write(`// ${filePath}\n${compiled}`);
  hasEmittedAnything = true;
}
