export type Spec = InterfaceSpec | ClassSpec | MethodSpec;

export interface InterfaceSpec {
  kind: SpecKind.Interface;
  name: string;
}

export interface ClassSpec {
  kind: SpecKind.Class;
  name: string;
}

export interface MethodSpec {
  kind: SpecKind.Method;
  name: string;
  spec: string;
  parent: string;
  paramNames: string[];
}

export interface PropertySpec {
  kind: SpecKind.Property;
  name: string;
  spec: string;
  parent: string;
}

export enum SpecKind {
  Class,
  Interface,
  Method,
  Expression,
  Parameter,
  Property
}

export interface Path {
  readonly parentPath: Path | undefined;
  readonly value: any;
}

export interface ASTType {
  check(node: any): boolean;
}



