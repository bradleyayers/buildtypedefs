import { expect } from 'chai';
import 'mocha';
import * as j from 'jscodeshift';
import { extractMethod, extractProperty } from '../src/extract';
import { SpecKind, MethodSpec, PropertySpec } from '../src/types';

describe('extractMethod', () => {
  function testExtractMethod(source: string, extracted: MethodSpec) {
    const comment = j(source).find(j.Comment).paths()[0];
    expect(extractMethod(comment)).to.deep.equal(extracted);
  }

  it('extracts class and method name and removes spec " : " prefix', () => {
    testExtractMethod(`
    class Foo {
      // : (?Object) → ContentMatch
      bar(a, b = 1) {}
    }
    `, {
      kind: SpecKind.Method,
      name: 'bar',
      spec: '(?Object) → ContentMatch',
      parent: 'Foo',
      paramNames: ['a', 'b'],
    });
  });

  it('extracts class and method name and removes spec " :: " prefix', () => {
    testExtractMethod(`
    class Foo {
      // :: (?Object) → ContentMatch
      bar(a, b = 1) {}
    }
    `, {
      kind: SpecKind.Method,
      name: 'bar',
      spec: '(?Object) → ContentMatch',
      paramNames: ['a', 'b'],
      parent: 'Foo'
    });
  });
});

describe('extractProperty', () => {
  function testExtractProperty(source: string, extracted: PropertySpec) {
    const comment = j(source).find(j.Comment).paths()[0];
    expect(extractProperty(comment)).to.deep.equal(extracted);
  }

  it('extracts from a constructor with " : " prefix', () => {
    testExtractProperty(`
    class Foo {
      constructor(schema) {
        // : Schema
        this.schema = schema
      }
    }
    `, {
      kind: SpecKind.Property,
      name: 'schema',
      spec: 'Schema',
      parent: 'Foo'
    });
  });

  it('extracts from a constructor with " :: " prefix', () => {
    testExtractProperty(`
    class Foo {
      constructor(schema) {
        // :: Schema
        this.schema = schema
      }
    }
    `, {
      kind: SpecKind.Property,
      name: 'schema',
      spec: 'Schema',
      parent: 'Foo'
    });
  });
});
