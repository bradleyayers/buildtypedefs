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

  const importDecls = Object.keys(imports).sort().map((moduleName) =>
    "import { " + imports[moduleName].sort().join(', ') + " } from '" + moduleName + "';"
  )

  return ([] as string[]).concat(
    importDecls,
    importDecls.length > 0 ? [""] : [],
    decls
  )

}