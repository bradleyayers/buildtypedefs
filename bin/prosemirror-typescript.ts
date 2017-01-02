import * as j from 'jscodeshift';
import { readFileSync } from 'fs';
import invariant from '../src/invariant';

const filePath = '/Users/brad/projects/prosemirror-typescript/bin/content.js'; //process.argv[3];
const fileContent = readFileSync(filePath, 'utf8');

interface Path {
  readonly parentPath: Path | undefined;
  readonly value: any;
}

enum SpecKind {
  Class,
  Interface,
  Method,
  Expression,
  Parameter
}

function parseSpec(commentSpec: Path): Spec | undefined {
  const methodDefinition = closestViaParentPath(commentSpec, j.MethodDefinition);
  if (methodDefinition) {
    const classDeclaration = closestViaParentPath(methodDefinition, j.ClassDeclaration);
    invariant(!!classDeclaration, 'Expected method to be in a class declaration.');

    return {
      kind: SpecKind.Method,
      name: methodDefinition.value.key.name,
      spec: commentSpec.value.value,
      parent: classDeclaration.value.id.name
    }
  }
}

function closestViaParentPath(path: Path, type: Type): Path | undefined {
  let parentPath = path.parentPath;
  while (parentPath && !type.check(parentPath.value)) {
    parentPath = parentPath.parentPath;
  }
  return parentPath;
}


type Spec = InterfaceSpec | ClassSpec | MethodSpec;

interface Type {
  check(node: any): boolean;
}

interface ASTNode {}

interface InterfaceSpec {
  kind: SpecKind.Interface;
  name: string;
}

interface ClassSpec {
  kind: SpecKind.Class;
  name: string;
}

interface MethodSpec {
  kind: SpecKind.Method;
  name: string;
  spec: string;
  parent: string;
}

// interface MethodSpec {
//   kind: SpecKind.Method;
//   name: string;
//   parent: string;
//   parameters: ParameterSpec[];
//   returnType: SpecKind.Expression;
// }

// interface ClassSpec {
//   kind: SpecKind.Class;
//   name: string;
// }

// interface InterfaceSpec {
//   kind: SpecKind.Interface;
//   name: string;
// }

// interface ParameterSpec {
//   kind: SpecKind.Parameter;
//   name: string;
//   optional: boolean;
//   value: SpecKind.Expression;
// }


// function typeAssociation(commentPath) {

// }

function isTypeComment(commentPath): boolean {
  return !!commentPath.value.value.match(/^ :: /);
}

interface Type {
  kind: TypeKind;
  optional: boolean;
  name: string;
}

enum TypeKind {
  Primitive
}

function parseTypeSpec(spec: string): Type {
  spec = trimPrefix(spec);

  let type =
    parsePrimitive(spec);

  if (!type) {
    throw new Error(`Unable to parse spec "${spec}".`)
  }

  return type;

  function parsePrimitive(str: string): Type | undefined {
    const [ match, optional, name ] = str.match(/^(\??)(number|string|Object)/);
    if (!!match) {
      return {
        kind: TypeKind.Primitive,
        optional: optional === '?',
        name
      };
    }
  }

  function trimPrefix(str: string): string {
    const prefixMatch = str.match(/^ :: (.*)$/);
    return !!prefixMatch
      ? prefixMatch[1]
      : str;
  }
}

j(fileContent)
  .find(j.Comment)
  .filter(isTypeComment)
  .forEach(path => {
    debugger;
    const spec = parseSpec(path);
    // if (spec) {
      console.log(spec);
    // }
    // const method = j(path).closest(j.MethodDefinition).size() === 1
    //   ? j(path).closest(j.MethodDefinition).paths()[0]
    //   : undefined;

    // if (method) {
    //   const methodName = method.value.key.name;
    //   const comment = path.value
    //   const type = path.value.match(/^ :: (.+))
    //   console.log()
    // }

    // j(path).replaceWith(
    //   j.identifier(path.node.name.split('').reverse().join(''))
    // );
  })
