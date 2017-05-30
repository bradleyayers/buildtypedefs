import StringBuilder = require('string-builder');
import {ModuleContents} from "./types"
import {GenEnv, Imports, TypeInfos, baseTypes, mergeTypeInfos} from "./env"
import {itemDef} from "./gendeclaration";

export default function (module: ModuleContents, name: string, typeInfos: TypeInfos): StringBuilder {

  typeInfos = mergeTypeInfos(typeInfos, baseTypes)

  const imports: Imports = {};
  const items = module.items || {};
  const env = new GenEnv(name, imports, typeInfos, new StringBuilder(""));

  Object.keys(items).forEach((item, index) => {
    if (index > 0) {
      env.appendLine("");
    }
    env.append("export ")
    itemDef(env, items[item], item);
    env.append(";");
  });

  let importStr: string = ""
  for(let moduleName of Object.keys(imports).sort()) {
    importStr += "import { " + imports[moduleName].sort().join(', ') + " } from '" + moduleName + "';\r\n"
  }
  if (importStr != "") importStr += "\r\n"

  return new StringBuilder(importStr + env.sb.toString())

}