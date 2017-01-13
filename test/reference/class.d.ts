export class Foo {
  constructor(a: number) {}

  a: number;
  b: number | ((number) => void);
  c: { [key: string]: number };

  static bar: number;
  static baz: (number) => void;
}
