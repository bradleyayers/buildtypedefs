import { extract, ClassTypeNode, Declaration } from './extract';
import { TypeNode, FunctionParameterTypeNode } from './getdocs/parser';

export function compile(javascriptSource: string): string {
  const exportedDeclarations = [];

  for (const declaration of extract(javascriptSource)) {
    if (declaration.exported) {
      switch (declaration.type.kind) {
        case 'Class':
          exportedDeclarations.push(renderClass(declaration));
          break;
        case 'Interface':
          exportedDeclarations.push(renderInterface(declaration));
          break;
        case 'Function':
          exportedDeclarations.push(renderFunction(declaration));
          break;
        case 'Name':
          exportedDeclarations.push(renderName(declaration));
          break;
        default:
          throw new Error(`Unable to render declaration '${declaration.type.kind}'.`);
      }
    }
  }

  return exportedDeclarations.join('\n\n') + '\n';
}

function renderName(nameDeclaration: Declaration): string {
  const source = [];

  if (nameDeclaration.type.kind === 'Name') {
    source.push(`export const ${nameDeclaration.name}: ${renderType(nameDeclaration.type)};`);
  }

  return source.join('');
}

function renderClass(classDeclaration: Declaration): string {
  if (classDeclaration.type.kind !== 'Class') return '';

  const { name, properties } = classDeclaration;
  const { staticProperties } = classDeclaration.type;
  const source = [];
  source.push(`export class ${name} {`);

  if (classDeclaration.type.constructorParameters) {
    source.push('\n  ');
    source.push(renderConstructor(classDeclaration.type.constructorParameters));
  }

  if (properties) {
    for (const propertyDeclaration of properties) {
      source.push('\n  ');
      source.push(`${renderProperty(propertyDeclaration)};`);
    }

    source.push('\n');
  }

  if (staticProperties) {
    for (const propertyDeclaration of staticProperties) {
      source.push('\n  ');
      source.push(`static ${renderProperty(propertyDeclaration)};`);
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

function renderFunction(functionDeclaration: Declaration): string {
  if (functionDeclaration.type.kind === 'Function') {
    const { name } = functionDeclaration;
    const { parameters, returnType } = functionDeclaration.type;

    const source = [];
    source.push(`export function ${name}(${renderParameters(parameters)})`);
    if (returnType) {
      source.push(`: ${renderType(returnType)}`);
    }
    source.push(' {}');

    return source.join('');
  }
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
    case 'Array':
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
      const name = isIdentifier(type.name)
        ? type.name
        : type.name.replace('.', '_');
      if (!isIdentifier(type.name)) {
        console.warn(`Unable to render '${type.name}' as an identifier, using '${name}' instead.`);
      }

      if (type.parameters && type.parameters.length) {
        return `${name}<${type.parameters.map(renderType).join(', ')}>`
      }

      switch (name) {
        case 'bool':
          return 'boolean';
        default:
          return name;
      }
    case 'Function':
      return `(${renderParameters(type.parameters)}) => ${renderType(type.returnType)}`;
    case 'Nullable':
      return `${renderType(type.type)} | null`;
    case 'NumberLiteral':
      return `${type.value}`;
    case 'Object':
      return `{ ${type.members.map(renderProperty).join(', ')} }`;
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
