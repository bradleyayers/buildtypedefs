import { expect } from 'chai';
import 'mocha';
import * as j from 'jscodeshift';
import { extractMethod, extractProperty, extract, Declaration } from '../src/extract';
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


describe('extract', () => {
  describe('with a type', () => {
    check('declaration', `
      // a:: foo
      `, [
        {
          name: 'a',
          typeSpec: 'foo'
        }
      ]);

    check('declaration, documentation', `
      // a:: foo
      // Some documentation
      `, [
        {
          name: 'a',
          typeSpec: 'foo'
        }
      ]);

    check('declaration, property', `
      // a:: foo
      //
      //  b:: foo
      `, [
        {
          name: 'a',
          typeSpec: 'foo',
          properties: [
            {
              name: 'b',
              typeSpec: 'foo'
            }
          ]
        }
      ]);

    check('declaration, two properties', `
      // a:: foo
      //
      //  b:: foo
      //
      //  c:: foo
      `, [
        {
          name: 'a',
          typeSpec: 'foo',
          properties: [
            {
              name: 'b',
              typeSpec: 'foo'
            },
            {
              name: 'c',
              typeSpec: 'foo'
            }
          ]
        }
      ]);

    check('declaration, property, property', `
      // a:: foo
      //
      //  b:: foo
      //
      //   c:: foo
      `, [
        {
          name: 'a',
          typeSpec: 'foo',
          properties: [
            {
              name: 'b',
              typeSpec: 'foo',
              properties: [
                {
                  name: 'c',
                  typeSpec: 'foo'
                }
              ]
            }
          ]
        }
      ]);
  });

  describe('interfaces from a comment', () => {
    check('declaration', `
      // a:: interface
      `, [
        {
          name: 'a',
          typeSpec: 'interface'
        }
      ]);

    check('declaration, documentation', `
      // a:: interface
      // Some documentation
      `, [
        {
          name: 'a',
          typeSpec: 'interface'
        }
      ]);

    check('declaration, documentation, empty', `
      // a:: interface
      // Some documentation
      //
      `, [
        {
          name: 'a',
          typeSpec: 'interface'
        }
      ]);

    check('declaration, documentation, empty, documentation', `
      // a:: interface
      // Some documentation
      //
      // Some documentation
      `, [
        {
          name: 'a',
          typeSpec: 'interface'
        }
      ]);

    check('declaration, documentation', `
      // a:: interface
      // Some documentation
      // a:: foo
      `, [
        {
          name: 'a',
          typeSpec: 'interface'
        }
      ]);

    check('declaration, empty, declaration', `
      // a:: interface
      //
      // b:: interface
      `, [
        {
          name: 'a',
          typeSpec: 'interface'
        },
        {
          name: 'b',
          typeSpec: 'interface'
        }
      ]);

    check('declaration with a property', `
      // a:: interface
      //
      //  b:: interface
      `, [
        {
          name: 'a',
          typeSpec: 'interface',
          properties: [
            {
              name: 'b',
              typeSpec: 'interface'
            }
          ]
        }
      ]);
  });

  describe('erroneously', () => {
    it('throws an error when no name can be derived', () => {
      expect(() => extract('// ::')).to.throw(Error);
    });

    it('throws an error when no type can be derived', () => {
      expect(() => extract('// foo::-')).to.throw(Error);
    });
  })

  describe('for a class', () => {
    check('class name', `
      // ::-
      class Foo {}
      `, [
        {
          name: 'Foo',
          typeSpec: 'class'
        }
      ]);

    check('explicit name trumps implied name', `
      // a::-
      class Foo {}
      `, [
        {
          name: 'a',
          typeSpec: 'class'
        }
      ]);

    check('method of declared class', `
      // ::-
      class Foo {
        // :: (?Object) → ContentMatch
        bar(a, b = 1) {}
      }
      `, [
        {
          name: 'Foo',
          typeSpec: 'class',
          properties: [
            {
              name: 'bar',
              typeSpec: '(?Object) → ContentMatch',
            }
          ]
        }
      ]);

    check('method of undeclared class', `
      class Foo {
        // :: (?Object) → ContentMatch
        bar(a, b = 1) {}
      }
      `, [
        {
          name: 'Foo',
          typeSpec: 'class',
          properties: [
            {
              name: 'bar',
              typeSpec: '(?Object) → ContentMatch',
            }
          ]
        }
      ]);

    check('property of declared class', `
      // ::-
      class Foo {
        // bar:: foo
      }
      `, [
        {
          name: 'Foo',
          typeSpec: 'class',
          properties: [
            {
              name: 'bar',
              typeSpec: 'foo',
            }
          ]
        }
      ]);

    check('property of an undeclared class', `
      class Foo {
        // bar:: foo
      }
      `, [
        {
          name: 'Foo',
          typeSpec: 'class',
          properties: [
            {
              name: 'bar',
              typeSpec: 'foo',
            }
          ]
        }
      ]);
  });


  function check(description: string, source: string, expected: Declaration[]) {
    it(description, () => {
      expect(extract(source)).to.deep.equal(expected);
    });
  }
});
