import {emptyEnvForTests} from "../src/env"
import {classDef} from "../src/gendeclaration";
import {ClassOrInterfaceDeclaration} from "../src/types";

describe('class definition', () => {

  const env = emptyEnvForTests();

  it('should add class definition', () => {
    const item: ClassOrInterfaceDeclaration = { type: "class" };
    classDef(env, item, "Foo").should.deep.equal([
      "class Foo {",
      "}"
    ])
  });

  it('should add class definition with generics', () => {
    const item: ClassOrInterfaceDeclaration= { type: "class", typeParams: [{ type: "Foo" }, { type: "Bar" }]};
    classDef(env, item, "Class1").should.deep.equal([
      "class Class1<Foo, Bar> {",
      "}"
    ])
  });

  it('should not use return type for a constructor', () => {
    const item: ClassOrInterfaceDeclaration = { type: "class", constructor: { type: "Function", id: "Foo.constructor"} };
    classDef(env, item, "Foo").should.deep.equal([
      "class Foo {",
      "  constructor()",
      "}"
    ])
  });

  it('should add class definition with one let property', () => {
    const item: ClassOrInterfaceDeclaration = { type: "class", properties: { prop1: { type: "number" } } };
    classDef(env, item, "Foo").should.deep.equal([
      "class Foo {",
      "  prop1: number;",
      "}"
    ])
  });

  it('should add class definition with one optional let property', () => {
    const item: ClassOrInterfaceDeclaration = { type: "class", properties: { prop1: { type: "number", optional: true } } };
    classDef(env, item, "Foo").should.deep.equal([
      "class Foo {",
      "  prop1?: number | null;",
      "}"
    ])
  });

  it('should add class definition with one union property', () => {
    const item: ClassOrInterfaceDeclaration = { type: "class", properties: { prop2: { type: "union", typeParams: [{type: "Node"}, {type: "Node2"}] } } };
    classDef(env, item, "Class1").should.deep.equal([
      "class Class1 {",
      "  prop2: Node | Node2;",
      "}"
    ])
  });

  it('should add class definition with one function property', () => {
    const item: ClassOrInterfaceDeclaration = { type: "class", properties: { prop1: { type: "Function", returns: { type: "any"}, params: [{name: "state", type: "EditorState"}] } } };
    classDef(env, item, "Foo").should.deep.equal([
      "class Foo {",
      "  prop1(state: EditorState): any",
      "}"
    ])
  });

  it('should add interface definition with one optional function property', () => {
    const item: ClassOrInterfaceDeclaration = { type: "interface", properties: { prop1: { type: "Function", optional: true, returns: { type: "any"}, params: [{name: "state", type: "EditorState"}] } } };
    classDef(env, item, "Foo").should.deep.equal([
      "interface Foo {",
      "  prop1?: ((state: EditorState) => any) | null;",
      "}"
    ])
  });

  it('should add class definition with one static let property', () => {
    const item: ClassOrInterfaceDeclaration = { type: "class", staticProperties: { prop1: { type: "number" } } };
    classDef(env, item, "Foo").should.deep.equal([
      "class Foo {",
      "  static prop1: number;",
      "}"
    ])
  });

  it('should add class definition with one static function property', () => {
    const item: ClassOrInterfaceDeclaration = { type: "class", staticProperties: { prop1: { type: "Function", returns: { type: "any" }, params: [{ name: "state", type: "EditorState" }] } } };
    classDef(env, item, "Foo").should.deep.equal([
      "class Foo {",
      "  static prop1(state: EditorState): any",
      "}"
    ])
  });

  it('should add class definition with two properties', () => {
    const item: ClassOrInterfaceDeclaration = { type: "class", properties: { prop1: { type: "number" } }, staticProperties: { prop2: { type: "Function", returns: { type: "any" }, params: [{ name: "state", type: "EditorState" }] } } };
    classDef(env, item, "Foo").should.deep.equal([
      "class Foo {",
      "  prop1: number;",
      "  static prop2(state: EditorState): any",
      "}"
    ])
  });

  it('should add class definition with JSDoc comments', () => {
    const item: ClassOrInterfaceDeclaration = { type: "class", description: "Lorem ipsum", properties: { prop1: { description: "number of props given", type: "number", optional: true } } };
    classDef(env, item, "Foo").should.deep.equal([
      "/**",
      " * Lorem ipsum",
      " */",
      "class Foo {",
      "  /**",
      "   * number of props given",
      "   */",
      "  prop1?: number | null;",
      "}"
    ])
  })

});