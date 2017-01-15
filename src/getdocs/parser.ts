import { createScanner, SyntaxKind } from './scanner';
import invariant from '../invariant';

export function parse(text: string) {
  const scanner = createScanner(text);
  let token = scanner.scan();

  function nextToken() {
    token = scanner.scan();
  }

  return parseType();

  function parseType(): TypeNode {
    switch (token) {
      case SyntaxKind.AsteriskToken:
      case SyntaxKind.AnyKeyword:
        return parseAny();
      case SyntaxKind.OpenBracketToken:
        return parseArray();
      case SyntaxKind.OpenParenToken:
        return parseFunction();
      case SyntaxKind.QuestionToken:
        return parseNullable();
      case SyntaxKind.Identifier:
        return parseName();
      case SyntaxKind.UnionKeyword:
        return parseUnion();
      case SyntaxKind.OpenBraceToken:
        return parseObject();
      case SyntaxKind.StringLiteral:
        return parseStringLiteral();
      case SyntaxKind.NumberLiteral:
        return parseNumberLiteral();
      default:
        throw new Error(`Unable to parse token ${token}`);
    }
  }

  function parseAny(): AnyTypeNode {
    nextToken();
    return {
      kind: 'Any'
    };
  }

  function parseNumberLiteral(): NumberLiteralTypeNode {
    const value = scanner.getTokenValue();
    nextToken();
    return {
      kind: 'NumberLiteral',
      value
    };
  }

  function parseStringLiteral(): StringLiteralTypeNode {
    const value = scanner.getTokenValue();
    nextToken();
    return {
      kind: 'StringLiteral',
      value
    };
  }

  function parseObject(): ObjectTypeNode {
    invariant(token === SyntaxKind.OpenBraceToken);
    return {
      kind: 'Object',
      members: parseBracketedList(ParsingContext.LiteralTypeMembers, parseTypeLiteralMember, SyntaxKind.OpenBraceToken, SyntaxKind.CloseBraceToken)
    };
  }

  function parseTypeLiteralMember(): ObjectMemberTypeNode {
    const name = parseIdentifier();
    skipExpected(SyntaxKind.ColonToken);
    const type = parseType();
    return {
      kind: 'ObjectMember',
      name,
      type
    };
  }

  function parseArray(): ArrayTypeNode {
    skipExpected(SyntaxKind.OpenBracketToken);
    const type = parseType();
    skipExpected(SyntaxKind.CloseBracketToken);
    return {
      kind: 'Array',
      type
    };
  }

  function parseNullable(): NullableTypeNode {
    nextToken();
    return {
      kind: 'Nullable',
      type: parseType()
    };
  }

  function parseIdentifier(): string {
    invariant(token === SyntaxKind.Identifier);
    const identifier = scanner.getTokenValue();
    nextToken();
    return identifier;
  }

  function parseName(): NameTypeNode {
    let name = parseIdentifier();
    while (skipOptional(SyntaxKind.DotToken)) {
      name += '.' + parseIdentifier();
    }
    let parameters;
    if (token === SyntaxKind.LessThanToken) {
      parameters = parseBracketedList(ParsingContext.NameParameters, parseType, SyntaxKind.LessThanToken, SyntaxKind.GreaterThanToken);
    }
    const node: NameTypeNode = {
      kind: 'Name',
      name
    };
    if (parameters) {
      node.parameters = parameters;
    }
    return node;
  }

  function parseUnion(): UnionTypeNode {
    invariant(token === SyntaxKind.UnionKeyword);
    nextToken();
    const types = parseBracketedList(ParsingContext.NameParameters, parseType, SyntaxKind.LessThanToken, SyntaxKind.GreaterThanToken);
    return {
      kind: 'Union',
      types
    };
  }

  function parseFunction(): FunctionTypeNode {
    const parameters = parseBracketedList(ParsingContext.Parameters, parseFunctionParameter, SyntaxKind.OpenParenToken, SyntaxKind.CloseParenToken);
    const node: FunctionTypeNode = {
      kind: 'Function',
      parameters,
    };
    if (skipOptional(SyntaxKind.RightArrowToken)) {
      node.returnType = parseType();
    }
    return node;
  }

  function parseFunctionParameter(): FunctionParameterTypeNode {
    let name;
    let rest;
    if (token === SyntaxKind.DotDotDotToken) {
      rest = true;
      nextToken();
    }
    if (scanner.lookAhead(isNamedFunctionParameterStart)) {
      name = parseIdentifier();
      skipExpected(SyntaxKind.ColonToken);
    }
    const type = parseType();
    const node: FunctionParameterTypeNode = {
      kind: 'FunctionParameter',
      type,
    };
    if (rest) {
      node.rest = rest;
    }
    if (name) {
      node.name = name;
    }
    return node;
  }

  function parseBracketedList<T>(context: ParsingContext, parseElement: () => T, open: SyntaxKind, close: SyntaxKind): T[] {
    skipExpected(open);
    const result = parseDelimitedList(context, parseElement);
    skipExpected(close);
    return result;
  }

  function parseDelimitedList<T>(context: ParsingContext, parseElement: () => T): T[] {
    const result = [];
    while (true) {
      if (isListTerminator(context)) {
        break;
      }
      result.push(parseElement());
      skipOptional(SyntaxKind.CommaToken);
    }
    return result;
  }

  function skipExpected(kind: SyntaxKind) {
    if (token !== kind) {
      throw new Error(`Expected to parse ${kind} but found ${token}`);
    }
    nextToken();
  }

  function skipOptional(kind: SyntaxKind) {
    if (token === kind) {
      nextToken();
      return true;
    }
    return false;
  }

  function isListTerminator(context: ParsingContext): boolean {
    switch (context) {
      case ParsingContext.NameParameters:
        return token === SyntaxKind.GreaterThanToken;
      case ParsingContext.Parameters:
        return token === SyntaxKind.CloseParenToken;
      case ParsingContext.LiteralTypeMembers:
        return token === SyntaxKind.CloseBraceToken;
    }
    return false;
  }

  function isNamedFunctionParameterStart(): boolean {
    return token === SyntaxKind.Identifier
      && scanner.scan() === SyntaxKind.ColonToken;
  }
}

/**
 * Spec:
 *
 *   A nullable type, written as a question mark followed by a type.
 */
export interface NullableTypeNode {
  kind: 'Nullable';
  type: TypeNode;
}

/**
 * Spec:
 *
 *   A JavaScript identifier, optionally followed by any number of properties,
 *   which are a dot character followed by a JavaScript identifier. A type name
 *   can be followed by a list of type parameters, between angle brackets, as in
 *   Object<string> (an object whose properties hold string values).
 */
export interface NameTypeNode {
  kind: 'Name';
  name: string;
  parameters?: TypeNode[];
}

export interface UnionTypeNode {
  kind: 'Union';
  types: TypeNode[];
}

/**
 * Spec:
 *
 *   A function type, which is written as a parenthesized list of argument types.
 *   Each argument type may optionally be prefixed with an argument name, which is
 *   an identifier followed by a colon. When an argument is prefixed by the string
 *   ..., it is marked as a rest argument. After the closing parenthesis, an
 *   optional return type may appear after an arrow, written either → or ->.
 */
export interface FunctionTypeNode {
  kind: 'Function';
  parameters: FunctionParameterTypeNode[];
  returnType?: TypeNode;
}

export interface FunctionParameterTypeNode {
  kind: 'FunctionParameter';
  name?: string;
  rest?: boolean;
  type: TypeNode;
}

/**
 * Spec:
 *
 *   An array type, which is a type wrapped in [ and ]. [x] is equivalent to Array<x>.
 */
export interface ArrayTypeNode {
  kind: 'Array';
  type: TypeNode;
}

/**
 * Spec:
 *
 *   An object type, written as a list of properties wrapped in { and } braces.
 *   Each property must start with an identifier, followed by a colon, followed by
 *   a type.
 */
export interface ObjectTypeNode {
  kind: 'Object';
  members: ObjectMemberTypeNode[];
}

export interface ObjectMemberTypeNode {
  kind: 'ObjectMember';
  name: string;
  type: TypeNode;
}

/**
 * Spec:
 *
 *   A string literal, enclosed by double quotes, or a number literal.
 */
export interface StringLiteralTypeNode {
  kind: 'StringLiteral';
  value: string;
}

export interface NumberLiteralTypeNode {
  kind: 'NumberLiteral';
  value: string;
}

/**
 * Spec:
 *
 *   An unspecified or “any” type, written as an asterisk *.
 */
export interface AnyTypeNode {
  kind: 'Any';
}

export type TypeNode = NullableTypeNode
  | NameTypeNode
  | UnionTypeNode
  | FunctionTypeNode
  | ArrayTypeNode
  | ObjectTypeNode
  | ObjectMemberTypeNode
  | StringLiteralTypeNode
  | NumberLiteralTypeNode
  | AnyTypeNode;

enum ParsingContext {
  Parameters,
  NameParameters,
  LiteralTypeMembers,
}
