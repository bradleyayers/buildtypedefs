import { expect } from 'chai';
import 'mocha';
import { createScanner, SyntaxKind } from '../../src/getdocs/scanner';

describe('scanner', () => {
  check('(', [
    SyntaxKind.OpenParenToken,
    SyntaxKind.EndOfFileToken
  ]);

  check(')', [
    SyntaxKind.CloseParenToken,
    SyntaxKind.EndOfFileToken
  ]);

  check('→', [
    SyntaxKind.RightArrow,
    SyntaxKind.EndOfFileToken
  ]);

  check('->', [
    SyntaxKind.RightArrow,
    SyntaxKind.EndOfFileToken
  ]);

  check('[', [
    SyntaxKind.OpenBracketToken,
    SyntaxKind.EndOfFileToken
  ]);

  check(']', [
    SyntaxKind.CloseBracketToken,
    SyntaxKind.EndOfFileToken
  ]);

  check('{', [
    SyntaxKind.OpenBraceToken,
    SyntaxKind.EndOfFileToken
  ]);

  check('}', [
    SyntaxKind.CloseBraceToken,
    SyntaxKind.EndOfFileToken
  ]);

  check('<', [
    SyntaxKind.LessThanToken,
    SyntaxKind.EndOfFileToken
  ]);

  check('>', [
    SyntaxKind.GreaterThanToken,
    SyntaxKind.EndOfFileToken
  ]);

  check('?', [
    SyntaxKind.QuestionToken,
    SyntaxKind.EndOfFileToken
  ]);

  check(',', [
    SyntaxKind.CommaToken,
    SyntaxKind.EndOfFileToken
  ]);

  check(':', [
    SyntaxKind.ColonToken,
    SyntaxKind.EndOfFileToken
  ]);

  check('a', [
    { kind: SyntaxKind.Identifier, value: 'a' },
    SyntaxKind.EndOfFileToken
  ]);

  check('aa', [
    { kind: SyntaxKind.Identifier, value: 'aa' },
    SyntaxKind.EndOfFileToken
  ]);

  check('a.b', [
    { kind: SyntaxKind.Identifier, value: 'a' },
    SyntaxKind.DotToken,
    { kind: SyntaxKind.Identifier, value: 'b' },
    SyntaxKind.EndOfFileToken
  ]);

  check('""', [
    { kind: SyntaxKind.StringLiteral, value: '' },
    SyntaxKind.EndOfFileToken
  ]);

  check('"a"', [
    { kind: SyntaxKind.StringLiteral, value: 'a' },
    SyntaxKind.EndOfFileToken
  ]);

  check('"\\a"', [
    { kind: SyntaxKind.StringLiteral, value: 'a' },
    SyntaxKind.EndOfFileToken
  ]);

  check('union', [
    SyntaxKind.UnionKeyword,
    SyntaxKind.EndOfFileToken
  ]);

  check(' ', [
    SyntaxKind.EndOfFileToken
  ]);

  it('scans "(Fragment, ?number, ?number) → ?union<ContentMatch, bool>"', () => {
    expect(scan('(Fragment, ?number, ?number) → ?union<ContentMatch, bool>')).to.deep.equal([
      SyntaxKind.OpenParenToken,
      { kind: SyntaxKind.Identifier, value: 'Fragment' },
      SyntaxKind.CommaToken,
      SyntaxKind.QuestionToken,
      { kind: SyntaxKind.Identifier, value: 'number' },
      SyntaxKind.CommaToken,
      SyntaxKind.QuestionToken,
      { kind: SyntaxKind.Identifier, value: 'number' },
      SyntaxKind.CloseParenToken,
      SyntaxKind.RightArrow,
      SyntaxKind.QuestionToken,
      SyntaxKind.UnionKeyword,
      SyntaxKind.LessThanToken,
      { kind: SyntaxKind.Identifier, value: 'ContentMatch' },
      SyntaxKind.CommaToken,
      { kind: SyntaxKind.Identifier, value: 'bool' },
      SyntaxKind.GreaterThanToken,
      SyntaxKind.EndOfFileToken
    ]);
  });

  interface Token {
    kind: SyntaxKind;
    value?: string;
  }

  /**
   * Scan text into a sequence of tokens suitable for deep equals assertion.
   */
  function scan(text: string): (SyntaxKind | Token)[] {
    const tokens = [];
    const scanner = createScanner(text);
    while (true) {
      const token = scanner.scan();
      switch (token) {
        case SyntaxKind.Identifier:
        case SyntaxKind.StringLiteral:
          tokens.push({ kind: token, value: scanner.getTokenValue() });
          break;
        default:
          tokens.push(token);
      }
      if (token === SyntaxKind.EndOfFileToken) {
        break;
      }
    }
    return tokens;
  }

  /**
   * Assert text is scanned into a sequence of tokens.
   */
  function check(text: string, tokens: any) {
    it(`scans \`${text}\``, () => {
      expect(scan(text)).to.deep.equal(tokens);
    });
  }
});
