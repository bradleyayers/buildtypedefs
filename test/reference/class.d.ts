export class Foo {
  constructor(a: number) {}

  a: number;
  b: number | ((number) => void);

  static bar: number;
  static baz: (number) => void;
}
