import {GenEnv} from "./env"
import {FunctionType, isFunction, isOther, Declaration, ClassOrInterfaceDeclaration, OtherDeclaration, isClassOrInterfaceDeclaration} from "./types";
import { typeDef, functionParamsDef, functionReturnDef, unionWith, nullType, undefinedType } from "./gentype";

function functionDeclarationDef(env: GenEnv, item: FunctionType): string {
  return functionParamsDef(env, item.params || []) + ": " + functionReturnDef(env, item.returns)
}

function jsDocComment(env: GenEnv, comment?: string): string[] {
  if (comment == undefined) return []
  return ([] as string[]).concat(
    ["/**"],
    comment.trim().split('\n').map((line) => " * " + line.trim()),
    [" */"]
  )
}

function miscDefBody(
  env: GenEnv,
  type: OtherDeclaration & { optional?: boolean },
  name: string,
  options: { isInlineProp: boolean }
): string {
  if (isFunction(type) && !type.optional) {
    const isConstructor = typeof type.id == "string" && /\.constructor$/.test(type.id);
    if (isConstructor) {
      return "constructor" + functionParamsDef(env, type.params || []) + ";"
    } else if (options.isInlineProp) {
      return `${name}${functionDeclarationDef(env, type)};`
    } else {
      return `function ${name}${functionDeclarationDef(env, type)}`
    }
  } else if (options.isInlineProp) {
    if (type.type) {
      if (type.optional) {
        return name + "?: " + typeDef(env, unionWith(type, nullType)) + ";"
      } else {
        return name + ": " + typeDef(env, type) + ";"
      }
    } else {
      return name + ";"
    }
  } else {
    return "let " + name +
      (type.type ? ": " + typeDef(env, type.optional ? unionWith(type, nullType, undefinedType) : type) : "")
  }
}

function miscDef(
  env: GenEnv,
  type: OtherDeclaration & { optional?: boolean },
  name: string,
  options: { isInlineProp: boolean, prefix?: string }
): string[] {

  return ([] as string[]).concat(
    jsDocComment(env, type.description),
    [(options.prefix || "") + miscDefBody(env, type, name, options)]
  )

}

function classOrInterfaceDef(
  env: GenEnv,
  decl: ClassOrInterfaceDeclaration,
  name: string,
  exportName: string | null = null,
  exportDecl: boolean = false
): string[] {
  const exportRenamed = typeof exportName == 'string' && exportName != name;

  let extendsClause = "";
  if (decl.extends) {
    const extendedDeclaration = isOther(decl.extends) && env.getDeclaration(decl.extends.type)
    if (extendedDeclaration && decl.type == "class" && extendedDeclaration.type == "interface") {
      extendsClause = ` implements ${typeDef(env, decl.extends)}`
      const extendedProps = extendedDeclaration.properties || {}
      // copy declarations of all non-overwritten properties
      for (const propName in extendedProps) {
        decl.properties = decl.properties || {}
        if (!decl.properties[propName]) {
          decl.properties[propName] = extendedProps[propName]
        }
      }
    } else {
      extendsClause = ` extends ${typeDef(env, decl.extends)}`
    }
  }

  const typeParams = decl.typeParams ? "<" + decl.typeParams.map((typeParam) => typeDef(env, typeParam)).join(", ") + ">" : ""
  const header = decl.type + " " + name + typeParams + extendsClause

  const properties = decl.properties || {}
  const staticProperties = decl.staticProperties || {}
  const decls = ([] as string[]).concat(
    (decl.constructor && !(decl.constructor instanceof Function))
      ? miscDef(env, decl.constructor, name, { isInlineProp: false })
      : [],
    ...Object.keys(properties).map((prop) => miscDef(env, properties[prop], prop, { isInlineProp: true })),
    ...Object.keys(staticProperties).map((prop) => miscDef(env, staticProperties[prop], prop, { isInlineProp: true, prefix: "static " }))
  )

  return ([] as string[]).concat(
    jsDocComment(env, decl.description),
    [`${exportDecl && !exportRenamed ? "export " : ""}${header} {`],
    decls.map((s) => "  " + s),
    ["}"],
    exportDecl && exportRenamed ? [`export { ${name} as ${exportName} }`] : []
  )
}

export function declarationDef(env: GenEnv, decl: Declaration, name: string, exportDecl: boolean = false): string[] {
  if (isClassOrInterfaceDeclaration(decl)) {
    const customCode: string | undefined = env.customCodeFor(name)
    if (typeof customCode == 'string') {
      return customCode.split("\n")
    }
    return classOrInterfaceDef(env, decl, env.resolveTypeName(name), name, exportDecl)
  }
  return miscDef(env, decl, name, { isInlineProp: false, prefix: exportDecl ? "export " : "" })
}