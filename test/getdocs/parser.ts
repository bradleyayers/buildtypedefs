import { expect } from 'chai';
import 'mocha';
import { parse } from '../../src/getdocs/parser';
import { SyntaxKind } from '../../src/getdocs/scanner';

describe('parser', () => {
  check('*', 'an any', {
    kind: 'Any'
  });

  check('any', 'an any', {
    kind: 'Any'
  });

  check('a', 'a name', {
    kind: 'Name',
    name: 'a'
  });

  check('a.b', 'a name with a dot', {
    kind: 'Name',
    name: 'a.b'
  });

  check('a<b>', 'a name with a parameter ', {
    kind: 'Name',
    name: 'a',
    parameters: [
      {
        kind: 'Name',
        name: 'b'
      }
    ]
  });

  check('?a', 'an optional name', {
    kind: 'Nullable',
    type: {
      kind: 'Name',
      name: 'a'
    }
  });

  check('""', 'an empty string literal', {
    kind: 'StringLiteral',
    value: ''
  });

  check('"a"', 'an empty string literal', {
    kind: 'StringLiteral',
    value: 'a'
  });

  check('0', 'a number literal', {
    kind: 'NumberLiteral',
    value: '0'
  });

  check('union<a>', 'a union with a single name', {
    kind: 'Union',
    types: [
      {
        kind: 'Name',
        name: 'a'
      }
    ]
  });

  check('union<a, b>', 'a union with two items', {
    kind: 'Union',
    types: [
      {
        kind: 'Name',
        name: 'a'
      },
      {
        kind: 'Name',
        name: 'b'
      }
    ]
  });

  check('?union<a>', 'an optional union', {
    kind: 'Nullable',
    type: {
      kind: 'Union',
      types: [
        {
          kind: 'Name',
          name: 'a'
        }
      ]
    }
  });

  check('()', 'a function with no parameters and no return value', {
    kind: 'Function',
    parameters: [],
  });

  check('?()', 'an optional function', {
    kind: 'Nullable',
    type: {
      kind: 'Function',
      parameters: []
    }
  });

  check('() → a', 'a function with a return value but no parameters', {
    kind: 'Function',
    parameters: [],
    returnType: {
      kind: 'Name',
      name: 'a'
    }
  });

  check('?() → a', 'an optional function with a return value', {
    kind: 'Nullable',
    type: {
      kind: 'Function',
      parameters: [],
      returnType: {
        kind: 'Name',
        name: 'a'
      }
    }
  });

  check('(a: b)', 'a function with one named parameter', {
    kind: 'Function',
    parameters: [
      {
        kind: 'FunctionParameter',
        name: 'a',
        type: {
          kind: 'Name',
          name: 'b'
        }
      }
    ]
  });

  check('(...a: b)', 'a function with one named rest parameter', {
    kind: 'Function',
    parameters: [
      {
        kind: 'FunctionParameter',
        name: 'a',
        rest: true,
        type: {
          kind: 'Name',
          name: 'b'
        }
      }
    ]
  });

  check('(a) → b', 'a function with one parameter and a return value', {
    kind: 'Function',
    parameters: [
      {
        kind: 'FunctionParameter',
        type: {
          kind: 'Name',
          name: 'a'
        }
      }
    ],
    returnType: {
      kind: 'Name',
      name: 'b'
    }
  });

  check('(?a) → b', 'a function with an optional parameter and a return value', {
    kind: 'Function',
    parameters: [
      {
        kind: 'FunctionParameter',
        type: {
          kind: 'Nullable',
          type: {
            kind: 'Name',
            name: 'a'
          }
        }
      }
    ],
    returnType: {
      kind: 'Name',
      name: 'b'
    }
  });

  check('(a, ?b) → c', 'a function with multiple parameters', {
    kind: 'Function',
    parameters: [
      {
        kind: 'FunctionParameter',
        type: {
          kind: 'Name',
          name: 'a'
        }
      },
      {
        kind: 'FunctionParameter',
        type: {
          kind: 'Nullable',
          type: {
            kind: 'Name',
            name: 'b'
          }
        }
      }
    ],
    returnType: {
      kind: 'Name',
      name: 'c'
    }
  });

  check('[a]', 'an array', {
    kind: 'Array',
    type: {
      kind: 'Name',
      name: 'a'
    }
  });

  check('{}', 'an empty object type', {
    kind: 'Object',
    members: []
  });

  check('{node: dom.Node, offset: number}', 'an object type', {
    kind: 'Object',
    members: [
      {
        kind: 'ObjectMember',
        name: 'node',
        type: {
          kind: 'Name',
          name: 'dom.Node'
        }
      },
      {
        kind: 'ObjectMember',
        name: 'offset',
        type: {
          kind: 'Name',
          name: 'number'
        }
      }
    ]
  });

  function check(text: string, typeDescription: string, type: any) {
    it(`parses \`${text}\` as ${typeDescription}`, () => {
      expect(parse(text)).to.deep.equal(type);
    });
  }
});
