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
      case SyntaxKind.OpenBracketToken:
        return parseArray();
      case SyntaxKind.OpenParenToken:
        return parseFunction();
      case SyntaxKind.QuestionToken:
        return parseNullable();
      case SyntaxKind.Identifier:
        return parseEntity();
      case SyntaxKind.UnionKeyword:
        return parseUnion();
      case SyntaxKind.OpenBraceToken:
        return parseObject();
      case SyntaxKind.StringLiteral:
        return parseStringLiteral();
      default:
        throw new Error(`Unable to parse token ${token}`);
    }
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
      members: parseBracketedList(ParsingContext.LiteralTypeMembers, parseTypeLiteralMember, SyntaxKind.OpenBraceToken, SyntaxKind.CloseBraceToken);
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

  function parseEntity(): EntityTypeNode {
    let name = parseIdentifier();
    while (skipOptional(SyntaxKind.DotToken)) {
      name += '.' + parseIdentifier();
    }
    return {
      kind: 'Entity',
      name
    };
  }

  function parseUnion(): UnionTypeNode {
    invariant(token === SyntaxKind.UnionKeyword);
    nextToken();
    const types = parseBracketedList(ParsingContext.TypeParameters, parseType, SyntaxKind.LessThanToken, SyntaxKind.GreaterThanToken);
    return {
      kind: 'Union',
      types
    };
  }

  function parseFunction(): FunctionTypeNode {
    const parameters = parseBracketedList(ParsingContext.Parameters, parseType, SyntaxKind.OpenParenToken, SyntaxKind.CloseParenToken);
    const func: FunctionTypeNode = {
      kind: 'Function',
      parameters,
    };
    if (skipOptional(SyntaxKind.RightArrow)) {
      func.returnType = parseType();
    }
    return func;
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
      case ParsingContext.TypeParameters:
        return token === SyntaxKind.GreaterThanToken;
      case ParsingContext.Parameters:
        return token === SyntaxKind.CloseParenToken;
      case ParsingContext.LiteralTypeMembers:
        return token === SyntaxKind.CloseBraceToken;
    }
    return false;
  }
}

export interface NullableTypeNode {
  kind: 'Nullable';
  type: TypeNode;
}

export interface EntityTypeNode {
  kind: 'Entity';
  name: string;
}

export interface UnionTypeNode {
  kind: 'Union';
  types: TypeNode[];
}

export interface FunctionTypeNode {
  kind: 'Function';
  parameters: TypeNode[];
  returnType?: TypeNode;
}

export interface ArrayTypeNode {
  kind: 'Array';
  type: TypeNode;
}

export interface ObjectTypeNode {
  kind: 'Object';
  members: ObjectMemberTypeNode[];
}

export interface ObjectMemberTypeNode {
  kind: 'ObjectMember';
  name: string;
  type: TypeNode;
}

export interface StringLiteralTypeNode {
  kind: 'StringLiteral';
  value: string;
}

export type TypeNode = NullableTypeNode
  | EntityTypeNode
  | UnionTypeNode
  | FunctionTypeNode
  | ArrayTypeNode
  | ObjectTypeNode
  | ObjectMemberTypeNode
  | StringLiteralTypeNode;

enum ParsingContext {
  Parameters,
  TypeParameters,
  LiteralTypeMembers,
}
