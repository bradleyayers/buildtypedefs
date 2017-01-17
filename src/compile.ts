import { extract, ClassTypeNode, Declaration } from './extract';
import { TypeNode, FunctionParameterTypeNode } from './getdocs/parser';

export function compile(javascriptSource: string): string {
  const exportedDeclarations = [];
  let indentSize = 0;

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
        case 'Any':
        case 'Array':
        case 'Object':
        case 'Name':
        case 'Nullable':
        case 'NumberLiteral':
        case 'Union':
        case 'StringLiteral':
          exportedDeclarations.push(renderConst(declaration));
          break;
        default:
          throw new Error(`Unable to render declaration '${declaration.type.kind}'.`);
      }
    }
  }

  return exportedDeclarations.join('\n\n');

  function indentString(): string {
    const spaces = [];
    for (let i = 0; i < indentSize; i++) {
      spaces.push(' ');
    }
    return spaces.join('');
  }

  function renderConst(nameDeclaration: Declaration): string {
    const source = [];

    if (nameDeclaration.type) {
      source.push(`export const ${nameDeclaration.name}: `);
      switch (nameDeclaration.type.kind) {
        case 'Object':
          source.push(renderObject(nameDeclaration.type, true));
          break;
        default:
          source.push(renderType(nameDeclaration.type));
      }
      source.push(`;`);
    }

    return source.join('');
  }

  function renderClass(classDeclaration: Declaration): string {
    if (classDeclaration.type.kind !== 'Class') return '';

    const { name, properties } = classDeclaration;
    const { staticProperties, superClass } = classDeclaration.type;
    const source = [];
    source.push(`export class ${name} `);

    if (superClass) {
      source.push(`extends ${superClass} `);
    }

    source.push(`{`);

    indentSize += 2;

    if (classDeclaration.type.constructorParameters) {
      source.push(`\n${indentString()}`);
      source.push(renderConstructor(classDeclaration.type.constructorParameters));
      source.push('\n');
    }

    if (properties) {
      for (const propertyDeclaration of properties) {
        source.push(`\n${indentString()}`);
        source.push(`${renderProperty(propertyDeclaration)};`);
      }

      source.push('\n');
    }

    if (staticProperties) {
      for (const propertyDeclaration of staticProperties) {
        source.push(`\n${indentString()}`);
        source.push(`static ${renderProperty(propertyDeclaration)};`);
      }

      source.push('\n');
    }

    indentSize -= 2;

    source.push(`}`);
    return source.join('');
  }

  function renderInterface(interfaceDeclaration: Declaration): string {
    const { name, properties } = interfaceDeclaration;
    const source = [];
    source.push(`export interface ${name} {`);

    indentSize += 2;

    if (properties) {
      for (const propertyDeclaration of properties) {
        source.push(`\n${indentString()}`);
        source.push(renderProperty(propertyDeclaration));
        source.push(';');
      }

      source.push('\n');
    }

    indentSize -= 2;

    source.push(`}`);
    return source.join('');
  }

  function renderFunction(functionDeclaration: Declaration): string {
    if (functionDeclaration.type.kind === 'Function') {
      const { name } = functionDeclaration;
      const { parameters, returnType } = functionDeclaration.type;

      const source = [];
      source.push(`export function ${name}(${renderParameters(parameters)})`);
      source.push(`: ${returnType ? renderType(returnType) : 'void'}`);
      source.push(';');

      return source.join('');
    }
  }

  function renderConstructor(constructor: FunctionParameterTypeNode[]) {
    return `constructor(${renderParameters(constructor)});`;
  }

  function renderProperty(propertyDeclaration: Declaration): string {
    const { name, type } = propertyDeclaration;
    switch (type.kind) {
      case 'Nullable':
        return `${name}?: ${renderType(type.type)}`;
      case 'Object':
        return `${name}: ${renderObject(type, true)}`;
      case 'Any':
      case 'Array':
      case 'Name':
      case 'NumberLiteral':
      case 'StringLiteral':
      case 'Union':
        return `${name}: ${renderType(type)}`;
      case 'Function':
        return `${name}(${renderParameters(type.parameters)}): ${renderType(type.returnType)}`;
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

        switch (name) {
          case 'Object':
            if (type.parameters && type.parameters.length > 1) {
              throw new Error(`Unable to encode an ${name} with more than one type parameter.`);
            }
            return `{ [key: string]: ${
              type.parameters
                ? renderType(type.parameters[0])
                : 'any'
              } }`;
          case 'bool':
            return 'boolean';
          case 'constructor':
            if (type.parameters && type.parameters.length > 1) {
              throw new Error(`Unable to encode an ${name} with more than one type parameter.`);
            }
            return `{ new (...args: any[]): ${
              type.parameters
                ? renderType(type.parameters[0])
                : 'any'} }`;
          default:
            if (type.parameters && type.parameters.length) {
              return `${name}<${type.parameters.map(renderType).join(', ')}>`
            } else {
              return name;
            }
        }
      case 'Function':
        return (() => {
          if (!type.returnType) {
            return `(${renderParameters(type.parameters)}) => void`;
          }

          let suffix = type.returnType.kind === 'Nullable'
            ? ' | void'
            : '';

          const returnType = type.returnType.kind === 'Nullable'
            ? type.returnType.type
            : type.returnType;

          if (returnType.kind === 'Function') {
            return `(${renderParameters(type.parameters)}) => (${renderType(returnType)})${suffix}`;
          } else {
            return `(${renderParameters(type.parameters)}) => ${renderType(returnType)}${suffix}`;
          }
        })();
      case 'Nullable':
        return `${renderType(type.type)} | null`;
      case 'NumberLiteral':
        return 'number';
      case 'Object':
        return renderObject(type);
      case 'StringLiteral':
        return JSON.stringify(type.value);
      case 'Union':
        return type.types.map(type => {
          switch (type.kind) {
            case 'Function':
              return `(${renderType(type)})`;
            default:
              return renderType(type);
          }
        }).join(' | ');
      default:
        throw new Error(`Unable to render type '${type.kind}'.`);
    }
  }

  function renderObject(type: TypeNode, lineSeparateProperties: boolean = false) {
    if (type.kind === 'Object') {
      if (lineSeparateProperties) {
        indentSize += 2;
        const source = [`{\n${indentString()}`];
        source.push(type.members.map(renderProperty).join(`,\n${indentString()}`));
        indentSize -= 2;
        source.push(`\n${indentString()}}`);
        return source.join('');
      } else {
        return `{ ${type.members.map(renderProperty).join(', ')} }`;
      }
    }
  }

  function renderParameters(parameters: FunctionParameterTypeNode[]): string {
    return parameters.map((param, i) => {
      const parts = [];
      const optional = param.type.kind === 'Nullable';
      const type = param.type.kind === 'Nullable'
        ? param.type.type
        : param.type;
      if (param.rest) {
        parts.push('...');
      }
      parts.push(`${param.name || `_${i}`}${optional ? '?' : ''}: `);
      parts.push(renderType(type));
      return parts.join('');
    }).join(', ');
  }

  function isIdentifier(name: string): boolean {
    return name.length > 0 && name.indexOf('.') === -1;
  }
}

