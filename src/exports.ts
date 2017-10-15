import {TypeInfos} from "./env"
import {isClassOrInterfaceDeclaration, ModuleContents} from "./types"

export function exportedTypeInfos(moduleName: string, moduleContents: ModuleContents) {
  const typeInfos: TypeInfos = {}
  const allDecls = moduleContents.all || {}
  for (let declName in allDecls) {
    const decl = allDecls[declName];
    if (isClassOrInterfaceDeclaration(decl)) {
      typeInfos[declName] = {
        sourceModule: { name: moduleName },
        declaration: decl
      }
    }
  }
  return typeInfos
}