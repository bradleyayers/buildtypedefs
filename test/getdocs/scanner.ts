import { expect } from 'chai';
import 'mocha';
import { createScanner, SyntaxKind } from '../../src/getdocs/scanner';

describe('scanner', () => {
  it('scans (', () => {
    expect(scan('(')).to.deep.equal([
      SyntaxKind.OpenParenToken,
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans )', () => {
    expect(scan(')')).to.deep.equal([
      SyntaxKind.CloseParenToken,
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans →', () => {
    expect(scan('→')).to.deep.equal([
      SyntaxKind.RightArrow,
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans [', () => {
    expect(scan('[')).to.deep.equal([
      SyntaxKind.OpenBracketToken,
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans ]', () => {
    expect(scan(']')).to.deep.equal([
      SyntaxKind.CloseBracketToken,
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans {', () => {
    expect(scan('{')).to.deep.equal([
      SyntaxKind.OpenBraceToken,
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans }', () => {
    expect(scan('}')).to.deep.equal([
      SyntaxKind.CloseBraceToken,
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans <', () => {
    expect(scan('<')).to.deep.equal([
      SyntaxKind.LessThanToken,
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans >', () => {
    expect(scan('>')).to.deep.equal([
      SyntaxKind.GreaterThanToken,
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans ?', () => {
    expect(scan('?')).to.deep.equal([
      SyntaxKind.QuestionToken,
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans ,', () => {
    expect(scan(',')).to.deep.equal([
      SyntaxKind.CommaToken,
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans :', () => {
    expect(scan(':')).to.deep.equal([
      SyntaxKind.ColonToken,
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans identifier "a"', () => {
    expect(scan('a')).to.deep.equal([
      { kind: SyntaxKind.Identifier, value: 'a' },
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans identifier "aa"', () => {
    expect(scan('aa')).to.deep.equal([
      { kind: SyntaxKind.Identifier, value: 'aa' },
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans qualified name "a.b"', () => {
    expect(scan('a.b')).to.deep.equal([
      { kind: SyntaxKind.Identifier, value: 'a' },
      SyntaxKind.DotToken,
      { kind: SyntaxKind.Identifier, value: 'b' },
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('scans keyword "union"', () => {
    expect(scan('union')).to.deep.equal([
      SyntaxKind.UnionKeyword,
      SyntaxKind.EndOfFileToken
    ]);
  });

  it('skips whitespace', () => {
    expect(scan(' ')).to.deep.equal([SyntaxKind.EndOfFileToken]);
  });

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
   * Scan text into a sequence of tokens.
   */
  function scan(text: string): (SyntaxKind | Token)[] {
    const tokens = [];
    const scanner = createScanner(text);
    while (true) {
      const token = scanner.scan();
      tokens.push(token === SyntaxKind.Identifier
        ? { kind: token, value: scanner.getTokenValue() }
        : token);
      if (token === SyntaxKind.EndOfFileToken) {
        break;
      }
    }
    return tokens;
  }
});
