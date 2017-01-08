import { extract, ClassTypeNode, Declaration } from './extract';
import { TypeNode, FunctionParameterTypeNode } from './getdocs/parser';

export function compile(javascriptSource: string): string {
  const exportedDeclarations = [];

  for (const declaration of extract(javascriptSource)) {
    switch (declaration.type.kind) {
      case 'Class':
        exportedDeclarations.push(renderClass(declaration));
        break;
      case 'Interface':
        exportedDeclarations.push(renderInterface(declaration));
        break;
      default:
        throw new Error(`Unable to render declaration '${declaration.type.kind}'.`);
    }
  }

  return exportedDeclarations.join('\n\n') + '\n';
}

function renderClass(classDeclaration: Declaration): string {
  const { name, properties } = classDeclaration;
  const source = [];
  source.push(`export class ${name} {`);

  if (classDeclaration.type.kind === 'Class' && classDeclaration.type.ctor) {
    console.log(`constructor = ${classDeclaration.type.ctor}`);
    source.push('\n  ');
    source.push(renderConstructor(classDeclaration.type.ctor));
  }

  if (properties) {
    for (const propertyDeclaration of properties) {
      source.push('\n  ');
      source.push(renderProperty(propertyDeclaration));
      source.push(';');
    }

    source.push('\n');
  }

  source.push(`}`);
  return source.join('');
}

function renderInterface(interfaceDeclaration: Declaration): string {
  const { name, properties } = interfaceDeclaration;
  const source = [];
  source.push(`export interface ${name} {`);

  if (properties) {
    for (const propertyDeclaration of properties) {
      source.push('\n  ');
      source.push(renderProperty(propertyDeclaration));
      source.push(';');
    }

    source.push('\n');
  }

  source.push(`}`);
  return source.join('');
}

function renderConstructor(constructor: FunctionParameterTypeNode[]) {
  return `constructor(${renderParameters(constructor)}) {}`;
}

function renderProperty(propertyDeclaration: Declaration): string {
  const { name, type } = propertyDeclaration;
  switch (type.kind) {
    case 'Nullable':
      return `${name}?: ${renderType(type.type)}`;
    case 'Any':
    case 'Function':
    case 'Name':
    case 'Object':
    case 'NumberLiteral':
    case 'StringLiteral':
    case 'Union':
      return `${name}: ${renderType(type)}`;
    default:
      throw new Error(`Unable to render property type '${type.kind}'.`);
  }
}

function renderType(type?: TypeNode): string {
  if (!type) {
    return 'void';
  }

  switch (type.kind) {
    case 'Any':
      return 'any';
    case 'Array':
      return `${renderType(type.type)}[]`;
    case 'Name':
      if (!isIdentifier(type.name)) {
        throw new Error(`Unable to render '${type.name}' as an identifier.`);
      }
      return type.name;
    case 'Function':
      return `(${renderParameters(type.parameters)}) => ${renderType(type.returnType)}`;
    case 'NumberLiteral':
      return `${type.value}`;
    case 'Object':
      return `{${type.members.map(renderProperty).join(', ')}}`;
    case 'StringLiteral':
      return JSON.stringify(type.value);
    case 'Union':
      return type.types.map(renderType).join(' | ');
    default:
      throw new Error(`Unable to render type '${type.kind}'.`);
  }
}

function renderParameters(parameters: FunctionParameterTypeNode[]): string {
  return parameters.map(param => {
    const parts = [];
    if (param.rest) {
      parts.push('...');
    }
    if (param.name) {
      parts.push(`${param.name}: `);
    }
    parts.push(renderType(param.type));
    return parts.join('');
  }).join(', ');
}

function isIdentifier(name: string): boolean {
  return name.length > 0 && name.indexOf('.') === -1;
}
