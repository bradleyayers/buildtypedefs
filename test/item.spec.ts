import {emptyEnvForTests} from "../src/env"
import {itemDef} from "../src/gendeclaration";


const env = emptyEnvForTests();

describe('should add item definition', () => {
  it('should create a class', () => {
    let item = { type: "class" };
    itemDef(env, item, "Plugin").should.deep.equal(['class Plugin {',"}"])
  });
  it('should create a interface', () => {
    let item = { type: "interface" };
    itemDef(env, item, "Plugin").should.deep.equal(['interface Plugin {',"}"])
  });

  it('should create an object', () => {
    let item = { type: "Object", properties: { props: {type: "EditorProps", optional: true}} };
    itemDef(env, item, "PluginSpec").should.deep.equal(["let PluginSpec: { props?: EditorProps | null }"])
  });

  it('should handle a function', () => {
    let item = { type: "Function", params: [] };
    itemDef(env, item, "testFoo").should.deep.equal(["function testFoo(): void"])
  })

  it('should handle an optional function', () => {
    let item = { type: "Function", optional: true, params: [] };
    itemDef(env, item, "testFoo").should.deep.equal(["let testFoo: (() => void) | null | undefined"])
  });

  it('should allow using custom code for some definitions', () => {
    let item = { type: "interface" };
    const code = 'export type DOMOutputSpec = string | Node'
    const customEnv = emptyEnvForTests({ DOMOutputSpec: { code } });
    itemDef(customEnv, item, "DOMOutputSpec").should.deep.equal([code])
  });

});