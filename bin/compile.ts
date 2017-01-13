import { readFileSync } from 'fs';
import { compile } from '../src/compile';
import { usage } from 'yargs';

const { argv } = usage('Usage: $0 [file..]').help();

for (const filePath of argv._) {
  const fileContent = readFileSync(filePath, 'utf8');
  const compiled = compile(fileContent);
  if (compiled.length) {
    process.stdout.write(`// ${filePath}\n${compiled}`);
  }
}
