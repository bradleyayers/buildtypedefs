import { readFileSync } from 'fs';
import { compile } from '../src/compile';
import { usage } from 'yargs';

const { argv } = usage('Usage: $0 [file..]').help();

for (const filePath of argv._) {
  const fileContent = readFileSync(filePath, 'utf8');
  process.stdout.write(`// ${filePath}\n`);
  process.stdout.write(compile(fileContent));
}
