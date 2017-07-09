export type Imports = { [moduleName: string]: string[] }

export type TypeInfo = { replaceBy?: string, definedIn?: string, code?: string }
export type TypeInfos = { [typeName: string]: TypeInfo }

export const baseTypes: TypeInfos = {
  bool: { replaceBy: 'boolean' },
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
  function checkConflict(x: string | undefined, y: string | undefined, name: string): string | undefined {
    if (typeof x == 'string' && typeof y == 'string' && x != y) {
      throw new Error("conflicting '" + name + "' information for type '" + typeName + "'!")
    }
    return typeof x == 'string' ? x : y
  }

  return {
    replaceBy: checkConflict(a.replaceBy, b.replaceBy, 'replaceBy'),
    definedIn: checkConflict(a.definedIn, b.definedIn, 'definedIn'),
    code: checkConflict(a.code, b.code, 'code')
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

  resolveTypeName(rawName: string): string {
    const typeInfo = this.typeInfos[rawName]
    if (typeInfo) {
      const name = typeof typeInfo.replaceBy == 'string' ? typeInfo.replaceBy : rawName
      if (typeof typeInfo.definedIn == 'string' && typeInfo.definedIn != this.currModuleName) {
        const importsFromModule = this.imports[typeInfo.definedIn] || []
        if (importsFromModule.indexOf(rawName) == -1) importsFromModule.push(rawName)
        this.imports[typeInfo.definedIn] = importsFromModule
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