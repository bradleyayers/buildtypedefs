export function createScanner(text: string) {
  // Current position (end position of text of current token)
  let pos = 0;

  // end of text
  let end = text.length;

  // Start position of whitespace before current token
  let startPos = pos;

  // Start position of text of current token
  let tokenPos = pos;

  let token = SyntaxKind.Unknown;
  let tokenValue: string | undefined;

  return {,
    getToken: () => token,
    getTokenValue: () => tokenValue,
    scan
  };

  function scan(): SyntaxKind {
    startPos = pos;

    while (true) {
      tokenPos = pos;
      if (pos >= end) {
        return token = SyntaxKind.EndOfFileToken;
      }
      let ch = text.charCodeAt(pos);

      switch (ch) {
        case CharacterCodes.space:
          pos++
          continue;
        case CharacterCodes.openParen:
          pos++;
          return token = SyntaxKind.OpenParenToken;
        case CharacterCodes.closeParen:
          pos++;
          return token = SyntaxKind.CloseParenToken;
        case CharacterCodes.rightArrow:
          pos++;
          return token = SyntaxKind.RightArrowToken;
        case CharacterCodes.asterisk:
          pos++;
          return token = SyntaxKind.AsteriskToken;
        case CharacterCodes.question:
          pos++;
          return token = SyntaxKind.QuestionToken;
        case CharacterCodes.openBracket:
          pos++;
          return token = SyntaxKind.OpenBracketToken;
        case CharacterCodes.closeBracket:
          pos++;
          return token = SyntaxKind.CloseBracketToken;
        case CharacterCodes.openBrace:
          pos++;
          return token = SyntaxKind.OpenBraceToken;
        case CharacterCodes.closeBrace:
          pos++;
          return token = SyntaxKind.CloseBraceToken;
        case CharacterCodes.lessThan:
          pos++;
          return token = SyntaxKind.LessThanToken;
        case CharacterCodes.greaterThan:
          pos++;
          return token = SyntaxKind.GreaterThanToken;
        case CharacterCodes.comma:
          pos++;
          return token = SyntaxKind.CommaToken;
        case CharacterCodes.dot:
          pos++;
          return token = SyntaxKind.DotToken;
        case CharacterCodes.colon:
          pos++;
          return token = SyntaxKind.ColonToken;
        case CharacterCodes._0:
        case CharacterCodes._1:
        case CharacterCodes._2:
        case CharacterCodes._3:
        case CharacterCodes._4:
        case CharacterCodes._5:
        case CharacterCodes._6:
        case CharacterCodes._7:
        case CharacterCodes._8:
        case CharacterCodes._9:
          tokenValue = scanNumber();
          return token = SyntaxKind.NumberLiteral;
        case CharacterCodes.doubleQuote:
          tokenValue = scanString();
          return token = SyntaxKind.StringLiteral;
        default:
          // Treat '->' as equivalent to →
          if (ch === CharacterCodes.minus && text.charCodeAt(pos + 1) === CharacterCodes.greaterThan) {
            pos += 2;
            return token = SyntaxKind.RightArrowToken;
          }

          // Identifier
          if (isIdentifierStart(ch)) {
            pos++;
            while (pos < end && isIdentifierPart(ch = text.charCodeAt(pos))) pos++;
            tokenValue = text.substring(tokenPos, pos);
            switch (tokenValue) {
              case 'union':
                return token = SyntaxKind.UnionKeyword;
              case 'any':
                return token = SyntaxKind.AnyKeyword;
              default:
                return token = SyntaxKind.Identifier;
            }
          }
          throw new Error(`Invalid character at position ${pos}.`);
      }
    }
  }

  /**
   * Scan a number literal.
   */
  function scanNumber(): string {
    const start = pos;
    while (isDigit(text.charCodeAt(pos))) pos++;
    if (text.charCodeAt(pos) === CharacterCodes.dot) {
      pos++;
      while (isDigit(text.charCodeAt(pos))) pos++;
    }
    return "" + +(text.substring(start, pos));
  }

  /**
   * Scan a string literal.
   *
   * Spec:
   *
   *   A string literal, enclosed by double quotes, or a number literal.
   */
  function scanString(): string {
    const quote = text.charCodeAt(pos);
    pos++;
    let result = "";
    let start = pos;
    while (true) {
      if (pos >= end) {
        throw new Error(Errors.Unterminated_string_literal);
      }
      const ch = text.charCodeAt(pos);
      if (ch === quote) {
        result += text.substring(start, pos);
        pos++;
        break;
      }
      if (ch === CharacterCodes.backslash) {
        result += text.substring(start, pos);
        result += scanEscapeSequence();
        start = pos;
        continue;
      }
      pos++;
    }
    return result;
  }

  function scanEscapeSequence(): string {
    pos++;
    if (pos >= end) {
      throw new Error(Errors.Unexpected_end_of_text);
    }
    const ch = text.charCodeAt(pos);
    pos++;
    switch (ch) {
      case CharacterCodes._0:
        return "\0";
      case CharacterCodes.b:
        return "\b";
      case CharacterCodes.t:
        return "\t";
      case CharacterCodes.n:
        return "\n";
      case CharacterCodes.v:
        return "\v";
      case CharacterCodes.f:
        return "\f";
      case CharacterCodes.r:
        return "\r";
      case CharacterCodes.singleQuote:
        return "\'";
      case CharacterCodes.doubleQuote:
        return "\"";
      case CharacterCodes.u:
        // '\u{DDDDDDDD}'
        throw new Error(Errors.Unsupported_unicode_escape);
      case CharacterCodes.x:
        // '\xDD'
        throw new Error(Errors.Unsupported_hex_escape);
      // when encountering a LineContinuation (i.e. a backslash and a line terminator sequence),
      // the line terminator is interpreted to be "the empty code unit sequence".
      case CharacterCodes.carriageReturn:
        if (pos < end && text.charCodeAt(pos) === CharacterCodes.lineFeed) {
          pos++;
        }
      // fall through
      case CharacterCodes.lineFeed:
      case CharacterCodes.lineSeparator:
      case CharacterCodes.paragraphSeparator:
        return "";
      default:
        return String.fromCharCode(ch);
    }
  }
}

export function isIdentifierStart(ch: number): boolean {
  return ch >= CharacterCodes.A && ch <= CharacterCodes.Z || ch >= CharacterCodes.a && ch <= CharacterCodes.z ||
    ch === CharacterCodes.$ || ch === CharacterCodes._;
}

export function isIdentifierPart(ch: number): boolean {
  return ch >= CharacterCodes.A && ch <= CharacterCodes.Z || ch >= CharacterCodes.a && ch <= CharacterCodes.z ||
    ch >= CharacterCodes._0 && ch <= CharacterCodes._9 || ch === CharacterCodes.$ || ch === CharacterCodes._;
}

export enum SyntaxKind {
  EndOfFileToken,
  Unknown,
  // Literals
  NumberLiteral,
  StringLiteral,
  // Type
  TypeReference,
  FunctionType,
  ConstructorType,
  TypeLiteral,
  ArrayType,
  UnionType,
  ParenthesizedType,
  LiteralType,
  // Identifiers
  Identifier,
  // Punctuation
  OpenBraceToken,
  CloseBraceToken,
  OpenParenToken,
  CloseParenToken,
  OpenBracketToken,
  CloseBracketToken,
  DotToken,
  CommaToken,
  RightArrowToken,
  QuestionToken,
  LessThanToken,
  GreaterThanToken,
  ColonToken,
  AsteriskToken,
  // Reserved words
  AnyKeyword,
  UnionKeyword,
}

export const enum CharacterCodes {
  nullCharacter = 0,
  maxAsciiCharacter = 0x7F,

  lineFeed = 0x0A,              // \n
  carriageReturn = 0x0D,        // \r
  lineSeparator = 0x2028,
  paragraphSeparator = 0x2029,
  nextLine = 0x0085,

  // Unicode 3.0 space characters
  space = 0x0020,   // " "
  nonBreakingSpace = 0x00A0,   //
  enQuad = 0x2000,
  emQuad = 0x2001,
  enSpace = 0x2002,
  emSpace = 0x2003,
  threePerEmSpace = 0x2004,
  fourPerEmSpace = 0x2005,
  sixPerEmSpace = 0x2006,
  figureSpace = 0x2007,
  punctuationSpace = 0x2008,
  thinSpace = 0x2009,
  hairSpace = 0x200A,
  zeroWidthSpace = 0x200B,
  narrowNoBreakSpace = 0x202F,
  ideographicSpace = 0x3000,
  mathematicalSpace = 0x205F,
  ogham = 0x1680,

  _ = 0x5F,
  $ = 0x24,

  _0 = 0x30,
  _1 = 0x31,
  _2 = 0x32,
  _3 = 0x33,
  _4 = 0x34,
  _5 = 0x35,
  _6 = 0x36,
  _7 = 0x37,
  _8 = 0x38,
  _9 = 0x39,

  a = 0x61,
  b = 0x62,
  c = 0x63,
  d = 0x64,
  e = 0x65,
  f = 0x66,
  g = 0x67,
  h = 0x68,
  i = 0x69,
  j = 0x6A,
  k = 0x6B,
  l = 0x6C,
  m = 0x6D,
  n = 0x6E,
  o = 0x6F,
  p = 0x70,
  q = 0x71,
  r = 0x72,
  s = 0x73,
  t = 0x74,
  u = 0x75,
  v = 0x76,
  w = 0x77,
  x = 0x78,
  y = 0x79,
  z = 0x7A,

  A = 0x41,
  B = 0x42,
  C = 0x43,
  D = 0x44,
  E = 0x45,
  F = 0x46,
  G = 0x47,
  H = 0x48,
  I = 0x49,
  J = 0x4A,
  K = 0x4B,
  L = 0x4C,
  M = 0x4D,
  N = 0x4E,
  O = 0x4F,
  P = 0x50,
  Q = 0x51,
  R = 0x52,
  S = 0x53,
  T = 0x54,
  U = 0x55,
  V = 0x56,
  W = 0x57,
  X = 0x58,
  Y = 0x59,
  Z = 0x5a,

  ampersand = 0x26,             // &
  asterisk = 0x2A,              // *
  at = 0x40,                    // @
  backslash = 0x5C,             // \
  backtick = 0x60,              // `
  bar = 0x7C,                   // |
  caret = 0x5E,                 // ^
  closeBrace = 0x7D,            // }
  closeBracket = 0x5D,          // ]
  closeParen = 0x29,            // )
  colon = 0x3A,                 // :
  comma = 0x2C,                 // ,
  dot = 0x2E,                   // .
  doubleQuote = 0x22,           // "
  equals = 0x3D,                // =
  exclamation = 0x21,           // !
  greaterThan = 0x3E,           // >
  hash = 0x23,                  // #
  lessThan = 0x3C,              // <
  minus = 0x2D,                 // -
  openBrace = 0x7B,             // {
  openBracket = 0x5B,           // [
  openParen = 0x28,             // (
  percent = 0x25,               // %
  plus = 0x2B,                  // +
  question = 0x3F,              // ?
  semicolon = 0x3B,             // ;
  singleQuote = 0x27,           // '
  slash = 0x2F,                 // /
  tilde = 0x7E,                 // ~

  backspace = 0x08,             // \b
  formFeed = 0x0C,              // \f
  byteOrderMark = 0xFEFF,
  tab = 0x09,                   // \t
  verticalTab = 0x0B,           // \v

  rightArrow = 0x2192,          // →
}

function isDigit(ch: number): boolean {
  return ch >= CharacterCodes._0 && ch <= CharacterCodes._9;
}

const Errors = {
  Unexpected_end_of_text: 'Unexpected end of text.',
  Unterminated_string_literal: 'Unterminated string literal.',
  Unsupported_unicode_escape: 'Unicode escape codes are unsupported.',
  Unsupported_hex_escape: 'Hex escape codes are unsupported.',
  Digit_expected: 'Digit expected.'
};
