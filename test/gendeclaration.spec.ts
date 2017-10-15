import {emptyEnvForTests} from "../src/env"
import {declarationDef} from "../src/gendeclaration";
import {ClassOrInterfaceDeclaration} from "../src/types";

const env = emptyEnvForTests();

describe('declarations', () => {

  describe('classes and interfaces', () => {

    it('should add class definition', () => {
      const item: ClassOrInterfaceDeclaration = { type: "class" };
      declarationDef(env, item, "Foo").should.deep.equal([
        "declare class Foo {",
        "}"
      ])
    });

    it('should add class definition with generics', () => {
      const item: ClassOrInterfaceDeclaration= { type: "class", typeParams: [{ type: "Foo" }, { type: "Bar" }]};
      declarationDef(env, item, "Class1").should.deep.equal([
        "declare class Class1<Foo, Bar> {",
        "}"
      ])
    });

    it('should not use return type for a constructor', () => {
      const item: ClassOrInterfaceDeclaration = { type: "class", constructor: { type: "Function", id: "Foo.constructor"} };
      declarationDef(env, item, "Foo").should.deep.equal([
        "declare class Foo {",
        "  constructor();",
        "}"
      ])
    });

    it('should add class definition with one let property', () => {
      const item: ClassOrInterfaceDeclaration = { type: "class", properties: { prop1: { type: "number" } } };
      declarationDef(env, item, "Foo").should.deep.equal([
        "declare class Foo {",
        "  prop1: number;",
        "}"
      ])
    });

    it('should add class definition with one optional let property', () => {
      const item: ClassOrInterfaceDeclaration = { type: "class", properties: { prop1: { type: "number", optional: true } } };
      declarationDef(env, item, "Foo").should.deep.equal([
        "declare class Foo {",
        "  prop1?: number | null;",
        "}"
      ])
    });

    it('should add class definition with one union property', () => {
      const item: ClassOrInterfaceDeclaration = { type: "class", properties: { prop2: { type: "union", typeParams: [{type: "Node"}, {type: "Node2"}] } } };
      declarationDef(env, item, "Class1").should.deep.equal([
        "declare class Class1 {",
        "  prop2: Node | Node2;",
        "}"
      ])
    });

    it('should add class definition with one function property', () => {
      const item: ClassOrInterfaceDeclaration = { type: "class", properties: { prop1: { type: "Function", returns: { type: "any"}, params: [{name: "state", type: "EditorState"}] } } };
      declarationDef(env, item, "Foo").should.deep.equal([
        "declare class Foo {",
        "  prop1(state: EditorState): any;",
        "}"
      ])
    });

    it('should add interface definition with one optional function property', () => {
      const item: ClassOrInterfaceDeclaration = { type: "interface", properties: { prop1: { type: "Function", optional: true, returns: { type: "any"}, params: [{name: "state", type: "EditorState"}] } } };
      declarationDef(env, item, "Foo").should.deep.equal([
        "declare interface Foo {",
        "  prop1?: ((state: EditorState) => any) | null;",
        "}"
      ])
    });

    it('should add class definition with one static let property', () => {
      const item: ClassOrInterfaceDeclaration = { type: "class", staticProperties: { prop1: { type: "number" } } };
      declarationDef(env, item, "Foo").should.deep.equal([
        "declare class Foo {",
        "  static prop1: number;",
        "}"
      ])
    });

    it('should add class definition with one static function property', () => {
      const item: ClassOrInterfaceDeclaration = { type: "class", staticProperties: { prop1: { type: "Function", returns: { type: "any" }, params: [{ name: "state", type: "EditorState" }] } } };
      declarationDef(env, item, "Foo").should.deep.equal([
        "declare class Foo {",
        "  static prop1(state: EditorState): any;",
        "}"
      ])
    });

    it('should add class definition with two properties', () => {
      const item: ClassOrInterfaceDeclaration = { type: "class", properties: { prop1: { type: "number" } }, staticProperties: { prop2: { type: "Function", returns: { type: "any" }, params: [{ name: "state", type: "EditorState" }] } } };
      declarationDef(env, item, "Foo").should.deep.equal([
        "declare class Foo {",
        "  prop1: number;",
        "  static prop2(state: EditorState): any;",
        "}"
      ])
    });

    it('should extend classes', () => {
      const decl: ClassOrInterfaceDeclaration = { type: "class", extends: { type: "Bar" }, properties: {} };
      declarationDef(env, decl, "Foo").should.deep.equal([
        "declare class Foo extends Bar {",
        "}"
      ]);
    });

    it('should create a interface', () => {
      const decl = { type: "interface" };
      declarationDef(env, decl, "Plugin").should.deep.equal([
        'declare interface Plugin {',
        "}"
      ])
    });

    it('should extend interfaces', () => {
      const decl: ClassOrInterfaceDeclaration = { type: "interface", extends: { type: "Bar" }, properties: {} };
      declarationDef(env, decl, "Foo").should.deep.equal([
        "declare interface Foo extends Bar {",
        "}"
      ]);
    });

    it('should add class definition with JSDoc comments', () => {
      const item: ClassOrInterfaceDeclaration = { type: "class", description: "Lorem ipsum", properties: { prop1: { description: "number of props given", type: "number", optional: true } } };
      declarationDef(env, item, "Foo").should.deep.equal([
        "/**",
        " * Lorem ipsum",
        " */",
        "declare class Foo {",
        "  /**",
        "   * number of props given",
        "   */",
        "  prop1?: number | null;",
        "}"
      ])
    })

  });

  describe('constructors', () => {

    it('should create a constructor', () => {
      const decl = {id: "Plugin.constructor", name: "Plugin", type: "Function"};
      declarationDef(env, decl, "item1").should.deep.equal([
        'constructor();'
      ])
    });

    it('should create a constructor with one parameter', () => {
      const decl = { id: "Plugin.constructor", name: "Plugin", type: "Function", params: [{name: "spec", type: "PluginSpec"}] };
      declarationDef(env, decl, "item1").should.deep.equal([
        'constructor(spec: PluginSpec);'
      ])
    });

    it('should create a constructor with two parameter', () => {
      const decl = { id: "Plugin.constructor", name: "Plugin", type: "Function", params: [{ name: "spec", type: "PluginSpec" }, { name: "spec2", type: "number" }] };
      declarationDef(env, decl, "item1").should.deep.equal([
        'constructor(spec: PluginSpec, spec2: number);'
      ])
    });

  });

  describe('other declarations', () => {

    it('should create an object', () => {
      const decl = { type: "Object", properties: { props: {type: "EditorProps", optional: true}} };
      declarationDef(env, decl, "PluginSpec").should.deep.equal(["let PluginSpec: { props?: EditorProps | null }"])
    });

    it('should handle a function', () => {
      const decl = { type: "Function", params: [] };
      declarationDef(env, decl, "testFoo").should.deep.equal(["function testFoo(): void"])
    })

    it('should handle an optional function', () => {
      const decl = { type: "Function", optional: true, params: [] };
      declarationDef(env, decl, "testFoo").should.deep.equal(["let testFoo: (() => void) | null | undefined"])
    });

    it('should allow using custom code for some definitions', () => {
      const decl = { type: "interface" };
      const code = 'export type DOMOutputSpec = string | Node';
      const customEnv = emptyEnvForTests({ DOMOutputSpec: { code } });
      declarationDef(customEnv, decl, "DOMOutputSpec").should.deep.equal([code]);
    });

  });

});