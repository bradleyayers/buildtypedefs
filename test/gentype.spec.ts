import {emptyEnvForTests} from "../src/env"
import {typeDef} from "../src/gentype";
import {Parameter, FunctionType} from "../src/types";

function mkFunction(...params: Parameter[]): FunctionType {
  return { type: "Function", params };
}

describe('types', () => {

  const env = emptyEnvForTests();

  describe('basic types', () => {

    it('should handle string', () => {
      const type = { type: "string" };
      typeDef(env, type).should.equal("string")
    });

    it('should handle bool', () => {
      const type = { type: "bool" };
      typeDef(env, type).should.equal("boolean")
    });

    it('should handle the true singleton type', () => {
      const type = { type: "true" };
      typeDef(env, type).should.equal("true")
    });

    it('should handle the false singleton type', () => {
      const type = { type: "false" };
      typeDef(env, type).should.equal("false")
    });

    it('should handle string singleton types', () => {
      const type = { type: '"foo"' };
      typeDef(env, type).should.equal('"foo"')
    });

  });

  describe('union type', () => {

    it('should handle an empty union', () => {
      const type = { type: "union", typeParams: [] };
      typeDef(env, type).should.equal("never")
    })

    it('should handle a union with one type param', () => {
      const type = { type: "union", typeParams: [{ type: "string" }] };
      typeDef(env, type).should.equal("string")
    });

    it('should handle a union with one function type param', () => {
      const type = { type: "union", typeParams: [{ type: "Function", params: [{type: "string"}] }] };
      typeDef(env, type).should.equal("(p: string) => void")
    })

    it('should handle a union with two type params', () => {
      const type = { type: "union", typeParams: [{ type: "number" }, { type: "string" }] };
      typeDef(env, type).should.equal("number | string")
    });

    it('should handle a union with one array type param', () => {
      const type = { type: "union", typeParams: [{ type: "Array", typeParams: [{type: "Node"}] }] };
      typeDef(env, type).should.equal("Node[]")
    });

    it('should handle a union with one number param and one function', () => {
      const type = { type: "union", typeParams: [{ type: "number" }, { type: "Function", params: [{type: "string"}] }] };
      typeDef(env, type).should.equal("number | ((p: string) => void)")
    });

    it('should handle a union with one number param and one function with two params', () => {
      const type = { type: "union", typeParams: [{ type: "number" }, { type: "Function", params: [{ type: "string" }, { type: "string" }] }] };
      typeDef(env, type).should.equal("number | ((p1: string, p2: string) => void)")
    });

  });

  describe('array type', () => {

    it('should handle an array with one type param', () => {
      const type = { type: "Array", typeParams: [{ type: "string" }] };
      typeDef(env, type).should.equal("string[]")
    });

    it('should handle two-dimensional arrays', () => {
      const type = { type: "Array", typeParams: [{ type: "Array", typeParams: [{ type: "string" }] }] };
      typeDef(env, type).should.equal("string[][]")
    });

    it('should handle an array of unions', () => {
      const type = { type: "Array", typeParams: [{ type: "union", typeParams: [{ type: "number" }, { type: "bool" }] }] };
      typeDef(env, type).should.equal("Array<number | boolean>")
    });

  });

  describe('function type', () => {

    it('should handle constructors', () => {
      const type = { type: "constructor", typeParams: [{ type: "Foo" }] }
      typeDef(env, type).should.equal("{ new(...args: any[]): Foo }")
    });

    it('should handle a function', () => {
      const type = { type: "Function", params: [] };
      typeDef(env, type).should.equal("() => void")
    });

    it('with return type void', () => {
      const type = mkFunction();
      typeDef(env, type).should.equal("() => void")
    });

    it('should handle optional bool return type', () => {
      const type: FunctionType = { type: "Function", params: [], returns: { type: "bool", optional: true } }
      typeDef(env, type).should.equal("() => boolean | null | void")
    })

    it('should handle optional function return type', () => {
      const type: FunctionType = { type: "Function", params: [], returns: { type: "union", optional: true, typeParams: [{ type: "string" }, { type: "Function", params: [] }] } }
      typeDef(env, type).should.equal("() => string | (() => void) | null | void")
    })

    it('Object', () => {
      const type: FunctionType = { type: "Function", params: [], returns: { type: "Object" } }
      typeDef(env, type).should.equal("() => { [key: string]: any }")
    });

    it('one named parameter', () => {
      const type = mkFunction({ type: "bool", name: "param1" })
      typeDef(env, type).should.equal("(param1: boolean) => void")
    });

    it('one optional named parameter', () => {
      const type = mkFunction({ type: "bool", name: "param1", optional: true })
      typeDef(env, type).should.equal("(param1?: boolean) => void")
    });

    it('two named parameters', () => {
      const type = mkFunction({ type: "bool", name: "param1" }, { type: "Object", name: "param2" })
      typeDef(env, type).should.equal("(param1: boolean, param2: { [key: string]: any }) => void")
    });

    it('two optional named parameters', () => {
      const type = mkFunction({ type: "bool", name: "param1", optional: true }, { type: "number", name: "param2", optional: true })
      typeDef(env, type).should.equal("(param1?: boolean, param2?: number) => void")
    });

    it('an optional parameter followed by a normal parameter', () => {
      const type = mkFunction({ type: "bool", name: "param1", optional: true }, { type: "number", name: "param2" })
      typeDef(env, type).should.equal("(param1: boolean | undefined, param2: number) => void")
    })

    it('rest parameter', () => {
      const type = mkFunction({ type: "bool", name: "param1", rest: true });
      typeDef(env, type).should.equal("(...param1: boolean) => void")
    });

    it('array with function parameter', () => {
      const type = mkFunction({ type: "Array", name: "param1", typeParams: [{type: "Function", params: []}] })
      typeDef(env, type).should.equal("(param1: Array<() => void>) => void")
    });

    it('function parameter', () => {
      const type = mkFunction({ type: "Function", params: [], name: "param1" });
      typeDef(env, type).should.equal("(param1: () => void) => void")
    });

    it('optional function parameter', () => {
      const type = mkFunction({ type: "Function", params: [], name: "param1", optional: true });
      typeDef(env, type).should.equal("(param1?: () => void) => void")
    });

  });

  describe('object type', () => {

    it('should handle objects with a known value type', () => {
      const type = { type: "Object", typeParams: [{ type: "bool" }] }
      typeDef(env, type).should.equal("{ [name: string]: boolean }")
    });

    it('should handle an object with unknown properties', () => {
      const type = { type: "Object", };
      typeDef(env, type).should.equal("{ [key: string]: any }")
    });

    it('with one property', () => {
      const type = { type: "Object", properties: { prop1: { type: "string" } } };
      typeDef(env, type).should.equal("{ prop1: string }")
    });

    it('with two properties', () => {
      const type = {
        type: "Object",
        properties: { prop1: { type: "string" }, prop2: { type: "Object" } }
      };
      typeDef(env, type).should.equal("{ prop1: string, prop2: { [key: string]: any } }")
    });

    it('should use method syntax for function properties', () => {
      const type = {
        type: "Object",
        properties: {
          prop1: { type: "Function", params: [{ name: "p", type: "string" }], returns: { type: "bool" } }
        }
      };
      typeDef(env, type).should.equal("{ prop1(p: string): boolean }")
    })

  });

  describe('other types (with parameters)', () => {

    it('should handle other with one type param', () => {
      const type = { type: "MyType", typeParams: [{name: "typeParam1", type: "string" }]};
      typeDef(env, type).should.equal("MyType<string>")
    });

    it('should handle other with two type params', () => {
      const type = { type: "MyType", typeParams: [{ name: "typeParam1", type: "string" }, { name: "typeParam2", type: "number" }]};
      typeDef(env, type).should.equal("MyType<string, number>")
    });

  });

});