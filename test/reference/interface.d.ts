export interface Foo {
  a: number;
  b?: number;
  c: () => void;
  d: (a: number) => void;
  e: (a: number, ...b: number[]) => void;
  f: () => number;
  g: (a: number) => number;
  h: (a: number, ...b: number[]) => number;
  i: number | string;
  j: {a: number};
  k: {a: number, b: string};
  l?: (Node) => Fragment;
  m: any;
  n: any;
  o: "foo";
  p: 5;
}
