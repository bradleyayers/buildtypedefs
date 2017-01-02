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
        return parseCallSignature();
      case SyntaxKind.QuestionToken:
        return parseOptional();
      case SyntaxKind.Identifier:
        return parseEntity();
      case SyntaxKind.UnionKeyword:
        return parseUnion();
      case SyntaxKind.OpenBraceToken:
        return parseTypeLiteral();
      default:
        throw new Error(`Unable to parse token ${token}`);
    }
  }

  function parseTypeLiteral(): TypeLiteralTypeNode {
    invariant(token === SyntaxKind.OpenBraceToken);
    return {
      kind: 'TypeLiteral',
      members: parseBracketedList(ParsingContext.LiteralTypeMembers, parseTypeLiteralMember, SyntaxKind.OpenBraceToken, SyntaxKind.CloseBraceToken);
    };
  }

  function parseTypeLiteralMember(): PropertySignatureTypeNode {
    const name = parseIdentifier();
    skipExpected(SyntaxKind.ColonToken);
    const type = parseType();
    return {
      kind: 'PropertySignature',
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

  function parseOptional(): OptionalTypeNode {
    nextToken();
    return {
      kind: 'Optional',
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

  function parseCallSignature(): CallSignatureTypeNode {
    const parameters = parseBracketedList(ParsingContext.Parameters, parseType, SyntaxKind.OpenParenToken, SyntaxKind.CloseParenToken);
    const func: CallSignatureTypeNode = {
      kind: 'CallSignature',
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

export interface OptionalTypeNode {
  kind: 'Optional';
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

export interface CallSignatureTypeNode {
  kind: 'CallSignature';
  parameters: TypeNode[];
  returnType?: TypeNode;
}

export interface ArrayTypeNode {
  kind: 'Array';
  type: TypeNode;
}

export interface TypeLiteralTypeNode {
  kind: 'TypeLiteral';
  members: PropertySignatureTypeNode[];
}

export interface PropertySignatureTypeNode {
  kind: 'PropertySignature';
  name: string;
  type: TypeNode;
}

export type TypeNode = OptionalTypeNode
  | EntityTypeNode
  | UnionTypeNode
  | CallSignatureTypeNode
  | ArrayTypeNode
  | TypeLiteralTypeNode
  | PropertySignatureTypeNode;

enum ParsingContext {
  Parameters,
  TypeParameters,
  LiteralTypeMembers,
}
