import { ClassOrInterfaceDeclaration } from "./types"

export type Imports = { [moduleName: string]: { names: string[], wholeModuleAs?: string } }

export type TypeInfo = {
  replaceBy?: string,
  sourceModule?: { name: string, isWholeModule?: boolean },
  declaration?: ClassOrInterfaceDeclaration,
  code?: string
}
export type TypeInfos = { [typeName: string]: TypeInfo }

export const baseTypes: TypeInfos = {
  bool: { replaceBy: 'boolean' },
  true: {},
  false: {},
  string: {},
  number: {},
  any: {},
  // It's tempting to replace by `object` here, but using that type for return
  // values means that it's not possible to do arbitrary property access (e.g.
  // `attrs.foo`). Instead, an indexed type is used to support this.
  Object: { replaceBy: '{ [key: string]: any }' },
  this: {},
  null: {},
  undefined: {},
  void: {},
  T: {} // TODO: handle type parameters dynamically!
}

function mergeTypeInfo(a: TypeInfo, b: TypeInfo, typeName: string) {
  function checkConflict<A>(x: A | undefined, y: A | undefined, isEq: (x: A, y: A) => boolean, name: string): A | undefined {
    if (x != undefined && y != undefined && !isEq(x, y)) {
      throw new Error("conflicting '" + name + "' information for type '" + typeName + "'!")
    }
    return (typeof x != undefined) ? x : y
  }

  const stringEq = (x: string, y: string) => x == y;
  const moduleEq = (x: { name: string, isWholeModule?: boolean }, y: { name: string, isWholeModule?: boolean }) => x.name == y.name && !!x.isWholeModule == !!y.isWholeModule;

  return {
    replaceBy: checkConflict(a.replaceBy, b.replaceBy, stringEq, 'replaceBy'),
    definedIn: checkConflict(a.sourceModule, b.sourceModule, moduleEq, 'definedIn'),
    code: checkConflict(a.code, b.code, stringEq, 'code')
  }
}

export function mergeTypeInfos(a: TypeInfos, b: TypeInfos): TypeInfos {
  const res = {}
  for (let typeName in a) {
    if (b[typeName]) {
      res[typeName] = mergeTypeInfo(a[typeName], b[typeName], typeName)
    } else {
      res[typeName] = a[typeName]
    }
  }
  for (let typeName in b) {
    if (!a[typeName]) {
      res[typeName] = b[typeName]
    }
  }
  return res
}

export class GenEnv {
  readonly imports: Imports
  private currModuleName: string
  private typeInfos: TypeInfos

  private static warnedAbout: { [name: string]: true } = {}

  constructor(currModuleName: string, imports: Imports, typeInfos: TypeInfos) {
    this.currModuleName = currModuleName
    this.imports = imports
    this.typeInfos = typeInfos
  }

  customCodeFor(rawName: string): string | undefined {
    const typeInfo = this.typeInfos[rawName]
    return typeInfo && typeInfo.code
  }

  getDeclaration(rawName: string): undefined | ClassOrInterfaceDeclaration {
    const typeInfo = this.typeInfos[rawName]
    return typeInfo && typeInfo.declaration
  }

  resolveTypeName(rawName: string): string {
    const typeInfo = this.typeInfos[rawName]
    if (typeInfo) {
      const name = typeof typeInfo.replaceBy == 'string' ? typeInfo.replaceBy : rawName
      if (typeof typeInfo.sourceModule == 'object' && typeInfo.sourceModule.name != this.currModuleName) {
        const importsFromModule = this.imports[typeInfo.sourceModule.name] || { names: [] }
        if (typeInfo.sourceModule.isWholeModule) {
          importsFromModule.wholeModuleAs = name
        } else if (importsFromModule.names.indexOf(rawName) == -1) {
          importsFromModule.names.push(rawName)
        }
        this.imports[typeInfo.sourceModule.name] = importsFromModule
      }
      return name
    }
    if (!GenEnv.warnedAbout[rawName]) {
      console.log("unknown type '" + rawName + "'!")
      GenEnv.warnedAbout[rawName] = true
    }
    return rawName
  }
}

export function emptyEnvForTests(additionalTypes: TypeInfos = {}): GenEnv {
  return new GenEnv("test", {}, mergeTypeInfos(baseTypes, additionalTypes))
}