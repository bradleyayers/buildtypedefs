import {GenEnv} from "./env"
import {Type, FunctionType, ArrayType, ObjectType, Parameter, OtherType, isOther} from "./types";
import * as types from "./types";

export function functionParamsDef(env: GenEnv, params: Parameter[]): string {
  let dummyNameCounter = 0;
  const paramStrs = params.map((param, i) => {
    let paramStr = '';
    if(param.rest) {
      paramStr += "..."
    }

    if (param.name) paramStr += param.name
    else {
      paramStr += "p"
      if(params.length > 1) paramStr += (++dummyNameCounter).toString()
    }
    if (param.optional) {
      if (params.slice(i).filter(p => !(p.rest || p.optional)).length == 0) {
        // only optional and rest parameters follow
        paramStr += "?: " + typeDef(env, param)
      } else {
        paramStr += ": " + typeDef(env, unionWith(param, undefinedType))
      }
    } else {
      paramStr += ": " + typeDef(env, param)
    }
    return paramStr
  })

  return "("+paramStrs.join(', ')+")"
}

export function unionWith(t: Type, ...ts: Type[]): Type {
  if (types.isOther(t) && t.type == "union") {
    return { type: "union", typeParams: (t.typeParams || []).concat(ts) }
  }
  return { type: "union", typeParams: [t].concat(ts) }
}

export const undefinedType: Type = { type: "undefined" };
export const nullType: Type = { type: "null" };
export const voidType: Type = { type: "void" };

export function functionReturnDef(env: GenEnv, type: types.ReturnType | undefined): string {
  if (type) {
    return typeDef(env, type.optional ? unionWith(type, nullType, voidType) : type)
  }
  return "void"
}

function functionDef(env: GenEnv, item: FunctionType): string {
  return functionParamsDef(env, item.params || []) + " => " + functionReturnDef(env, item.returns);
}

function isSimpleType(type: Type): boolean {
  return isOther(type) && (!type.typeParams || type.typeParams.length == 0);
}

function arrayDef(env: GenEnv, item: ArrayType): string {
  const elemType = item.typeParams[0];
  if (isSimpleType(elemType)) {
    return `${typeDef(env, elemType, true)}[]`;
  } else {
    return `Array<${typeDef(env, elemType)}>`;
  }
}

function objectDef(env: GenEnv, item: ObjectType): string {
  const propStrs = Object.keys(item.properties).map((name) => {
    const prop = item.properties[name]
    if (prop.optional) {
      return name + "?: " + typeDef(env, unionWith(prop, nullType))
    } else {
      return name + ": " + typeDef(env, prop)
    }
  })

  return "{ " + propStrs.join(", ") + " }"
}

function parenthesize(doIt: boolean, str: string) {
  return doIt ? "("+str+")" : str
}

function unionDef(env: GenEnv, typeParams: Type[], addParens: boolean = false): string {
  if (typeParams.length == 0) {
    return "never"
  } else if (typeParams.length == 1) {
    return typeDef(env, typeParams[0], addParens)
  } else {
    return parenthesize(addParens, typeParams.map((typeParam) => typeDef(env, typeParam, true)).join(' | '))
  }
}

function otherDef(env: GenEnv, type: OtherType): string {
  if (type.typeParams) {
    return env.resolveTypeName(type.type) +
      "<" + type.typeParams.map((param) => typeDef(env, param)).join(', ') + ">"
  } else {
    return env.resolveTypeName(type.type)
  }
}

export function typeDef(env: GenEnv, item: Type, addParens: boolean = false): string {
  if (types.isFunction(item)) {
    return parenthesize(addParens, functionDef(env, item))
  } else if (types.isArray(item)) {
    return arrayDef(env, item);
  } else if (types.isObject(item)) {
    return objectDef(env, item)
  } else if (item.type == "union") {
    return unionDef(env, item.typeParams || [], addParens)
  } else if (item.type == "Object" && item.typeParams && item.typeParams.length == 1) {
    const valueType = item.typeParams[0];
    return "{ [name: string]: " + typeDef(env, valueType) + " }"
  } else if (item.type == "constructor" && item.typeParams && item.typeParams.length == 1) {
    return "{ new(...args: any[]): " + typeDef(env, item.typeParams[0]) + " }"
  } else if (/^\"[^\"]*\"$/.test(item.type)) {
    // string singleton type
    return item.type
  } else {
    return otherDef(env, item)
  }
}