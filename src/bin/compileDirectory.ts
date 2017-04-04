#! /usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, unlinkSync, statSync, writeFileSync, existsSync } from 'fs';
import { compile } from '../compile';
import { usage } from 'yargs';
import { basename, extname, join, resolve } from 'path';

const { argv } = usage('Usage: $0 --overwrite --inDir <path> --outDir <path>')
  .boolean('overwrite')
  .demand(['inDir', 'outDir'])
  .help();

const inDirPath = resolve(argv.inDir);
const outDirPath = resolve(argv.outDir);

ensureDirectory(inDirPath);
ensureDirectory(outDirPath);

const outDirExistingFiles = new Set(readdirSync(outDirPath));

for (const sourceFileName of readdirSync(inDirPath)) {
  if (extname(sourceFileName) !== '.js') {
    continue;
  }

  const baseName = basename(sourceFileName, '.js');
  const declarationFileName = `${baseName}.d.ts`;
  const importProxyFileName = `${baseName}.js`;

  const outputFilesReady = prepareOutputFile(declarationFileName);
  if (outputFilesReady) {
    console.log(`> ${sourceFileName}`);
    const source = readFileSync(join(inDirPath, sourceFileName), 'utf8');
    const declarationSource = compile(source);
    if (declarationSource.length) {
      writeFileSync(join(outDirPath, declarationFileName), compile(source));
    }
  }
}

/**
 * Returns false if the path can't be used for writing.
 */
function prepareOutputFile(name: string): boolean {
  if (outDirExistingFiles.has(name)) {
    if (!argv.overwrite) {
      console.log(`'${name}' exists in output directory, skipping...`);
      return false;
    } else {
      console.log(`'${name}' exists in output directory, removing...`);
      unlinkSync(join(outDirPath, name));
    }
  }
  return true;
}

/**
 * Ensure that the path exists, and that it's a directory.
 *
 * The directory is created if it doesn't exist.
 */
function ensureDirectory(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path);
  } else if (!statSync(path).isDirectory()) {
    console.error(`'${path}' is not a directory.`);
    process.exit(1);
  }
}
