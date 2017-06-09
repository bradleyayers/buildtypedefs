import {GenEnv} from "./env"
import {FunctionType, Type, isFunction, isObject, Declaration, ClassOrInterfaceDeclaration, OtherDeclaration, isClassOrInterfaceDeclaration} from "./types";
import { typeDef, functionParamsDef, functionReturnDef, unionWith, nullType, undefinedType } from "./gentype";

function functionDeclarationDef(env: GenEnv, item: FunctionType) {
  functionParamsDef(env, item.params || []);
  env.append(": ")
  functionReturnDef(env, item.returns);
}

function jsDocComment(env: GenEnv, comment?: string) {
  if (comment == undefined) return
  env.append("/**")
  comment.trim().split('\n').forEach((line) => {
    env.appendLine(" * " + line.trim());
  })
  env.appendLine(" */")
  env.appendLine("")
}

export function miscDef(
  env: GenEnv,
  type: OtherDeclaration & { optional?: boolean },
  name: string,
  options: { isInlineProp: boolean, processItemProperties?: boolean, prefix?: string }
) {

  jsDocComment(env, type.description);
  env.append(options.prefix || "")

  if (isFunction(type) && !type.optional) {
    const isConstructor = typeof type.id == "string" && /\.constructor$/.test(type.id);
    if (isConstructor) {
      env.append("constructor")
      functionParamsDef(env, type.params || []);
    } else {
      if(!options.isInlineProp) env.append("function ")
      env.append(name)
      functionDeclarationDef(env, type);
    }
  } else if (options.isInlineProp) {
    env.append(name)
    if (type.type) {
      if (type.optional) {
        env.append("?: ")
        typeDef(env, unionWith(type, nullType))
      } else {
        env.append(": ")
        typeDef(env, type)
      }
    }
    env.append(";")
  } else {
    env.append("let " + name)
    if (type.type) {
      env.append(": ")
      typeDef(env, type.optional ? unionWith(type, nullType, undefinedType) : type)
    }
  }

  if(isObject(type) && options.processItemProperties) {
    for (let prop in type.properties) {
      miscDef(env, type.properties[prop], prop, { isInlineProp: true })
    }
  }

}

export function classDef(env: GenEnv, decl: ClassOrInterfaceDeclaration, name: string, exportDecl: boolean = false) {
  jsDocComment(env, decl.description)

  if (exportDecl) env.append("export ")
  env.append(decl.type + " " + name + " ")

  if (decl.typeParams) {
    env.append("<")
    for(let i in decl.typeParams) {
      if (i != "0"){
        env.append(", ")
      }

      typeDef(env, decl.typeParams[i]);
    }
    env.append("> ")
  }

  if(decl.extends) {
    env.append("extends ")
    typeDef(env, decl.extends);
    env.append(" ")
  }

  env.append("{")

  const indented = env.indent();

  if ("constructor" in decl && !(decl.constructor instanceof Function)) {
    indented.appendLine("")
    miscDef(indented, decl.constructor, name, { isInlineProp: false });
  }

  if (decl.properties) {
    for (let prop in decl.properties) {
      indented.appendLine("")
      miscDef(indented, decl.properties[prop], prop, { isInlineProp: true });
    }
  }

  if (decl.staticProperties) {
    for (let prop in decl.staticProperties) {
      indented.appendLine("")
      miscDef(indented, decl.staticProperties[prop], prop, { isInlineProp: true, prefix: "static " });
    }
  }

  env.appendLine("}")
}

export function itemDef(env: GenEnv, decl: Declaration, name: string, exportDecl: boolean = false) {
  if(isClassOrInterfaceDeclaration(decl)) {
    const customCode: string | undefined = env.customCodeFor(name)
    if (typeof customCode == 'string') {
      env.append(customCode)
    } else {
      classDef(env, decl, env.resolveTypeName(name), exportDecl)
    }
  } else {
    miscDef(env, decl, name, { isInlineProp: false, prefix: exportDecl ? "export " : "" })
  }
}