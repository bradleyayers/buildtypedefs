import { expect } from 'chai';
import 'mocha';
import { compile } from '../src/compile';
import invariant from '../src/invariant';
import { sync as globSync } from 'glob';
import { basename, join } from 'path'
import { readFileSync } from 'fs';

const directory = join(__dirname, 'reference');

describe('reference', () => {
  for (const file of globSync(join(directory, '*.js'))) {
    const javascript = file;
    const name = basename(javascript, '.js');
    const typescript = join(directory, `${name}.d.ts`)

    // if (name === 'scratchpad')
    it(`compiles '${name}'`, () => {
      const javascriptSource = readFileSync(javascript, 'utf8');
      const typescriptSource = readFileSync(typescript, 'utf8');

      expect(compile(javascriptSource)).to.equal(typescriptSource);
    });
  }
});
