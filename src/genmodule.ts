import {isClassOrInterfaceDeclaration, ModuleContents} from "./types"
import {GenEnv, Imports, TypeInfos, baseTypes, mergeTypeInfos} from "./env"
import {declarationDef} from "./gendeclaration";

export default function (module: ModuleContents, name: string, typeInfos: TypeInfos): string[] {

  typeInfos = mergeTypeInfos(typeInfos, baseTypes)

  const imports: Imports = {};
  const items = module.items || {};
  const env = new GenEnv(name, imports, typeInfos);

  const decls: string[] = ([] as string[]).concat(
    ...Object.keys(items).map((item, index) => {
      const decl = items[item];
      const lines = declarationDef(env, decl, item, true)
      if (!isClassOrInterfaceDeclaration(decl)) {
        lines[lines.length-1] += ";"
      }
      return lines
    })
  )

  function importClause(rawName: string) {
    const typeInfo = typeInfos[rawName]
    if (!typeInfo) return rawName
    if (typeInfo.replaceBy) return `${rawName} as ${typeInfo.replaceBy}`
    return rawName
  }

  const importDecls = ([] as string[]).concat(
    ...Object.keys(imports).sort().map((moduleName) => {
      const importSpec = imports[moduleName]
      const importStatements = []
      if (typeof importSpec.wholeModuleAs == 'string') {
        importStatements.push(`import ${importSpec.wholeModuleAs} = require('${moduleName}');`)
      }
      if (importSpec.names.length > 0) {
        importStatements.push(`import { ${importSpec.names.sort().map(importClause).join(', ')} } from '${moduleName}';`)
      }
      return importStatements
    })
  )

  return ([] as string[]).concat(
    importDecls,
    importDecls.length > 0 ? [""] : [],
    decls
  )

}