import { expect } from 'chai';
import 'mocha';
import * as j from 'jscodeshift';
import { extract, Declaration } from '../src/extract';
import { SpecKind, MethodSpec, PropertySpec } from '../src/types';

describe('extract', () => {
  describe('ambiugity', () => {
    check('declaration', `
      // includes:
      `, []);
  });

  describe('with a type', () => {
    check('declaration', `
      // a:: foo
      `, [
        {
          name: 'a',
          typeSpec: 'foo',
          type: {
            kind: 'Name',
            name: 'foo'
          }
        }
      ]);

    check('declaration, documentation', `
      // a:: foo
      // Some documentation
      `, [
        {
          name: 'a',
          typeSpec: 'foo',
          type: {
            kind: 'Name',
            name: 'foo'
          }
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
          type: {
            kind: 'Name',
            name: 'foo'
          },
          properties: [
            {
              name: 'b',
              typeSpec: 'foo',
              type: {
                kind: 'Name',
                name: 'foo'
              }
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
          type: {
            kind: 'Name',
            name: 'foo'
          },
          properties: [
            {
              name: 'b',
              typeSpec: 'foo',
              type: {
                kind: 'Name',
                name: 'foo'
              }
            },
            {
              name: 'c',
              typeSpec: 'foo',
              type: {
                kind: 'Name',
                name: 'foo'
              }
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
          type: {
            kind: 'Name',
            name: 'foo'
          },
          properties: [
            {
              name: 'b',
              typeSpec: 'foo',
              type: {
                kind: 'Name',
                name: 'foo'
              },
              properties: [
                {
                  name: 'c',
                  typeSpec: 'foo',
                  type: {
                    kind: 'Name',
                    name: 'foo'
                  }
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
          exported: true,
          name: 'a',
          typeSpec: 'interface',
          type: {
            kind: 'Interface'
          }
        }
      ]);

    check('declaration, documentation', `
      // a:: interface
      // Some documentation
      `, [
        {
          exported: true,
          name: 'a',
          typeSpec: 'interface',
          type: {
            kind: 'Interface'
          }
        }
      ]);

    check('declaration, documentation, empty', `
      // a:: interface
      // Some documentation
      //
      `, [
        {
          exported: true,
          name: 'a',
          typeSpec: 'interface',
          type: {
            kind: 'Interface'
          }
        }
      ]);

    check('declaration, documentation, empty, documentation', `
      // a:: interface
      // Some documentation
      //
      // Some documentation
      `, [
        {
          exported: true,
          name: 'a',
          typeSpec: 'interface',
          type: {
            kind: 'Interface'
          }
        }
      ]);

    check('declaration, documentation', `
      // a:: interface
      // Some documentation
      // a:: foo
      `, [
        {
          exported: true,
          name: 'a',
          typeSpec: 'interface',
          type: {
            kind: 'Interface'
          }
        }
      ]);

    check('declaration, empty, declaration', `
      // a:: interface
      //
      // b:: interface
      `, [
        {
          exported: true,
          name: 'b',
          typeSpec: 'interface',
          type: {
            kind: 'Interface'
          }
        },
        {
          exported: true,
          name: 'a',
          typeSpec: 'interface',
          type: {
            kind: 'Interface'
          }
        }
      ]);

    check('declaration with a property', `
      // a:: interface
      //
      //  b:: interface
      `, [
        {
          exported: true,
          name: 'a',
          typeSpec: 'interface',
          type: {
            kind: 'Interface'
          },
          properties: [
            {
              name: 'b',
              typeSpec: 'interface',
              type: {
                kind: 'Interface'
              }
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

  describe('for a variable', () => {
    check('name', `
      // ::-
      const foo = {};
      `, [
        {
          exported: false,
          name: 'foo',
          type: {
            kind: 'Any'
          },
        }
      ]);

    check('exported name', `
      // ::-
      const foo = {};
      exports.foo = foo;
      `, [
        {
          exported: true,
          name: 'foo',
          type: {
            kind: 'Any'
          },
        }
      ]);

    check('exported name explicit array type', `
      // :: [Foo]
      const foo = {};
      exports.foo = foo;
      `, [
        {
          exported: true,
          name: 'foo',
          type: {
            kind: 'Array',
            type: {
              kind: 'Name',
              name: 'Foo'
            }
          },
          typeSpec: '[Foo]'
        }
      ]);

    check('name and interface', `
      // Bar:: interface
      //
      //   baz:: number

      // ::-
      const foo = {};
      `, [
        {
          exported: false,
          name: 'foo',
          type: {
            kind: 'Any'
          },
        },
        {
          exported: true,
          name: 'Bar',
          type: {
            kind: 'Interface'
          },
          typeSpec: 'interface',
          properties: [
            {
              name: 'baz',
              type: {
                kind: 'Name',
                name: 'number'
              },
              typeSpec: 'number'
            }
          ]
        }
      ]);

    check('exported name and interface', `
      // Bar:: interface
      //
      //   baz:: number

      // ::-
      const foo = {};
      exports.foo = foo;
      `, [
        {
          exported: true,
          name: 'foo',
          type: {
            kind: 'Any'
          },
        },
        {
          exported: true,
          name: 'Bar',
          type: {
            kind: 'Interface'
          },
          typeSpec: 'interface',
          properties: [
            {
              name: 'baz',
              type: {
                kind: 'Name',
                name: 'number'
              },
              typeSpec: 'number'
            }
          ]
        }
      ]);
  });

  describe('for a function', () => {
    check('name', `
      // ::-
      function foo() {}
      `, [
        {
          exported: false,
          name: 'foo',
          type: {
            kind: 'Function',
            parameters: []
          },
        }
      ]);

    check('exported name', `
      // ::-
      function foo() {}
      exports.foo = foo;
      `, [
        {
          exported: true,
          name: 'foo',
          type: {
            kind: 'Function',
            parameters: []
          },
        }
      ]);

    check('unexported explicit type', `
      // :: (bar)
      function foo(a) {}
      `, [
        {
          exported: false,
          name: 'foo',
          type: {
            kind: 'Function',
            parameters: [
              {
                kind: 'FunctionParameter',
                name: 'a',
                type: {
                  kind: 'Name',
                  name: 'bar'
                }
              }
            ]
          },
          typeSpec: '(bar)'
        }
      ]);

    check('exported explicit type', `
      // :: (bar)
      function foo(a) {}
      exports.foo = foo;
      `, [
        {
          exported: true,
          name: 'foo',
          type: {
            kind: 'Function',
            parameters: [
              {
                kind: 'FunctionParameter',
                name: 'a',
                type: {
                  kind: 'Name',
                  name: 'bar'
                }
              }
            ]
          },
          typeSpec: '(bar)'
        }
      ]);

    check('exported explicit type without parameter name', `
      // :: (bar)
      function foo() {}
      exports.foo = foo;
      `, [
        {
          exported: true,
          name: 'foo',
          type: {
            kind: 'Function',
            parameters: [
              {
                kind: 'FunctionParameter',
                name: '_0',
                type: {
                  kind: 'Name',
                  name: 'bar'
                }
              }
            ]
          },
          typeSpec: '(bar)'
        }
      ]);

    check('exported explicit type with and without parameter name', `
      // :: (bar, baz)
      function foo(a) {}
      exports.foo = foo;
      `, [
        {
          exported: true,
          name: 'foo',
          type: {
            kind: 'Function',
            parameters: [
              {
                kind: 'FunctionParameter',
                name: 'a',
                type: {
                  kind: 'Name',
                  name: 'bar'
                }
              },
              {
                kind: 'FunctionParameter',
                name: '_1',
                type: {
                  kind: 'Name',
                  name: 'baz'
                }
              }
            ]
          },
          typeSpec: '(bar, baz)'
        }
      ]);
  });

  describe('for a class', () => {
    check('class name', `
      // ::-
      class Foo {}
      `, [
        {
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class',
          },
        }
      ]);

    check('class name with doc', `
      // ::- Bar
      class Foo {}
      `, [
        {
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class',
          },
        }
      ]);

    check('exported class name', `
      // ::-
      class Foo {}
      exports.Foo = Foo;
      `, [
        {
          exported: true,
          name: 'Foo',
          type: {
            kind: 'Class',
          },
        }
      ]);

    check('explicit name trumps implied name', `
      // a::-
      class Foo {}
      `, [
        {
          exported: false,
          name: 'a',
          type: {
            kind: 'Class',
          },
        }
      ]);

    check('exported explicit name trumps implied name', `
      // a::-
      class Foo {}
      exports.a = Foo;
      `, [
        {
          exported: true,
          name: 'a',
          type: {
            kind: 'Class',
          },
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
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class',
          },
          properties: [
            {
              name: 'bar',
              typeSpec: '(?Object) → ContentMatch',
              type: {
                kind: 'Function',
                parameters: [
                  {
                    kind: 'FunctionParameter',
                    name: 'a',
                    type: {
                      kind: 'Nullable',
                      type: {
                        kind: 'Name',
                        name: 'Object'
                      }
                    }
                  }
                ],
                returnType: {
                  kind: 'Name',
                  name: 'ContentMatch'
                }
              }
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
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class',
          },
          properties: [
            {
              name: 'bar',
              typeSpec: '(?Object) → ContentMatch',
              type: {
                kind: 'Function',
                parameters: [
                  {
                    kind: 'FunctionParameter',
                    name: 'a',
                    type: {
                      kind: 'Nullable',
                      type: {
                        kind: 'Name',
                        name: 'Object'
                      }
                    }
                  }
                ],
                returnType: {
                  kind: 'Name',
                  name: 'ContentMatch'
                }
              }
            }
          ]
        }
      ]);

    check('split comment documented method of undeclared class', `
      class Foo {
        // :: (?Object) → ContentMatch

        // Bar is a great function.
        bar(a, b = 1) {}
      }
      `, [
        {
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class',
          },
          properties: [
            {
              name: 'bar',
              typeSpec: '(?Object) → ContentMatch',
              type: {
                kind: 'Function',
                parameters: [
                  {
                    kind: 'FunctionParameter',
                    name: 'a',
                    type: {
                      kind: 'Nullable',
                      type: {
                        kind: 'Name',
                        name: 'Object'
                      }
                    }
                  }
                ],
                returnType: {
                  kind: 'Name',
                  name: 'ContentMatch'
                }
              }
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
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class'
          },
          properties: [
            {
              name: 'bar',
              typeSpec: 'foo',
              type: {
                kind: 'Name',
                name: 'foo'
              }
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
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class'
          },
          properties: [
            {
              name: 'bar',
              type: {
                kind: 'Name',
                name: 'foo'
              },
              typeSpec: 'foo',
            }
          ]
        }
      ]);

    check('static method of an undeclared class', `
      class Foo {
        // :: ()
        static bar() {}
      }
      `, [
        {
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class',
            staticProperties: [
              {
                name: 'bar',
                type: {
                  kind: 'Function',
                  parameters: []
                },
                typeSpec: '()',
              }
            ]
          }
        }
      ]);

    check('super class with declared class', `
      // ::-
      class Foo extends Bar {
        // bar:: foo
      }
      `, [
        {
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class',
            superClass: 'Bar'
          },
          properties: [
            {
              name: 'bar',
              type: {
                kind: 'Name',
                name: 'foo'
              },
              typeSpec: 'foo',
            }
          ]
        }
      ]);

    check('super class with undeclared class', `
      class Foo extends Bar {
        // bar:: foo
      }
      `, [
        {
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class',
            superClass: 'Bar'
          },
          properties: [
            {
              name: 'bar',
              type: {
                kind: 'Name',
                name: 'foo'
              },
              typeSpec: 'foo',
            }
          ]
        }
      ]);

    check('property via getdocs path', `
      class Foo {
        // :: number #path=Foo.prototype.text
        // For text nodes, this contains the node's text content.
      }
      `, [
        {
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class',
          },
          properties: [
            {
              name: 'text',
              type: {
                kind: 'Name',
                name: 'number'
              },
              typeSpec: 'number',
            }
          ]
        }
      ]);

    check('static method and property via getdocs path', `
      class Foo {
        // :: ()
        static bar() {}

        // :: number #path=Foo.prototype.text
        // For text nodes, this contains the node's text content.
      }
      `, [
        {
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class',
            staticProperties: [
              {
                name: 'bar',
                type: {
                  kind: 'Function',
                  parameters: []
                },
                typeSpec: '()',
              }
            ]
          },
          properties: [
            {
              name: 'text',
              type: {
                kind: 'Name',
                name: 'number'
              },
              typeSpec: 'number',
            }
          ]
        }
      ]);

    check('constructor initialised property of an undeclared class', `
      class Foo {
        constructor(foo) {
          // :: Foo
          this.bar = foo
        }
      }
      `, [
        {
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class'
          },
          properties: [
            {
              name: 'bar',
              type: {
                kind: 'Name',
                name: 'Foo'
              },
              typeSpec: 'Foo',
            }
          ]
        }
      ]);

    check('constructor initialised property of a declared class', `
      // ::-
      class Foo {
        constructor(foo) {
          // :: Foo
          this.bar = foo
        }
      }
      `, [
        {
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class',
          },
          properties: [
            {
              name: 'bar',
              type: {
                kind: 'Name',
                name: 'Foo'
              },
              typeSpec: 'Foo',
            }
          ]
        }
      ]);

    check('constructor', `
      class Foo {
        // :: (number)
        constructor(num) {}
      }
      `, [
        {
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class',
            constructorParameters: [
              {
                kind: 'FunctionParameter',
                name: 'num',
                type: {
                  kind: 'Name',
                  name: 'number'
                }
              }
            ],
          },
        }
      ]);

    check('constructor initialised object property of an undeclared class', `
      class Foo {
        constructor(foo) {
          // :: Object<string>
          this.capitals = {
            // :: "A"
            a: 'A',
            // :: "B"
            b: 'B'
          };
        }
      }
      `, [
        {
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class'
          },
          properties: [
            {
              name: 'capitals',
              type: {
                kind: 'Object',
                members: [
                  {
                    kind: 'ObjectMember',
                    name: 'a',
                    type: {
                      kind: 'StringLiteral',
                      value: 'A'
                    }
                  },
                  {
                    kind: 'ObjectMember',
                    name: 'b',
                    type: {
                      kind: 'StringLiteral',
                      value: 'B'
                    }
                  },
                ]
              }
            }
          ]
        }
      ]);

    check('static property of declared class', `
      // ::-
      class Foo {}

      // :: number
      Foo.bar = 1;
      `, [
        {
          exported: false,
          name: 'Foo',
          type: {
            kind: 'Class',
            staticProperties: [
              {
                exported: false,
                name: 'bar',
                type: {
                  kind: 'Name',
                  name: 'number'
                },
                typeSpec: "number"
              }
            ],
          },
        }
      ]);

    it('throws an error when a static property is declared for a non-declared container', () => {
      expect(() => extract(`
      class Foo {}

      // :: number
      Foo.bar = 1;
      `)).to.throw(Error);
    });
  })


  function check(description: string, source: string, expected: Declaration[]) {
    it(description, () => {
      expect(extract(source)).to.deep.equal(expected);
    });
  }
});
