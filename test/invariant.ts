import { expect } from 'chai';
import 'mocha';
import invariant from '../src/invariant';

describe('invariant', () => {
  it('throws an error when passed false', () => {
    expect(() => invariant(false)).to.throw(Error);
  });

  it('does not throw an error when passed true', () => {
    expect(() => invariant(true)).to.not.throw();
  });
});
