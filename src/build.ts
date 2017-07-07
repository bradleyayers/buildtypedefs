const fs = require("fs")
const getdocs = require("getdocs")
const mkdirp = require('mkdirp');
const path = require('path')
const glob = require('glob');

import {ModuleContents, Declaration} from "./types"
import {TypeInfos, mergeTypeInfos} from "./env"
import {exportedTypeInfos} from "./exports"
import moduleDef from "./genmodule";

function mkdirpIfNotExists(dir: string) {
  if (!fs.existsSync(dir)) {
    mkdirp.sync(dir)
    console.log("created '" + dir + "'")
  }
}

function readGetdocs (config: { files: string }): ModuleContents {
  const items: { [name: string]: Declaration } = Object.create(null)
  const files = config.files.split(" ").reduce(
    (set: string[], pat: string) => set.concat(glob.sync(pat)),
    []
  );
  files.forEach((filename:string) => {
    const file = fs.readFileSync(filename, "utf8")
    getdocs.gather(file, {filename: filename, items: items})
  });

  return {
    items: items,
    all: gatherAll({properties: items}, Object.create(null))
  };
}

function gatherAll(obj: any, target: { [name: string]: Declaration }): { [name: string]: Declaration } {
  if (obj.id) target[obj.id] = obj
  if (Object.prototype.hasOwnProperty.call(obj, "constructor")) gatherAll(obj.constructor, target)
  if (obj.properties) for (var prop in obj.properties) gatherAll(obj.properties[prop], target)
  if (obj.staticProperties) for (var prop in obj.staticProperties) gatherAll(obj.staticProperties[prop], target)
  return target
}

export default function (
  modules: { name: string, srcFiles: string, outFile: string, header?: string }[],
  typeInfos: TypeInfos
) {

  let moduleContents: { [name: string]: ModuleContents } = Object.create(null)

  for (let module of modules) {
    const mod = readGetdocs({ files: module.srcFiles })
    typeInfos = mergeTypeInfos(exportedTypeInfos(module.name, mod), typeInfos)
    moduleContents[module.name] = mod
  }

  for (let module of modules) {
    const mod = moduleContents[module.name]
    let sb = moduleDef(mod, module.name, typeInfos);
    mkdirpIfNotExists(path.dirname(module.outFile))
    fs.writeFileSync(module.outFile, (module.header || '') + sb.join("\n"));
  }

}
