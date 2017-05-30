import {GenEnv, emptyEnvForTests} from "../src/env"
import {itemDef} from "../src/gendeclaration";


let env: GenEnv;
let cr = "\r\n";

beforeEach(function () {
  env = emptyEnvForTests();
});

describe('should add item definition', () => {
  it('should create a class', () => {
    let item = { type: "class" };
    itemDef(env, item, "Plugin");
    env.sb.toString().should.equal('class Plugin {' + cr + "}")
  });
  it('should create a interface', () => {
    let item = { type: "interface" };
    itemDef(env, item, "Plugin");
    env.sb.toString().should.equal('interface Plugin {' + cr + "}")
  });

  it('should create an object', () => {
    let item = { type: "Object", properties: { props: {type: "EditorProps", optional: true}} };
    itemDef(env, item, "PluginSpec");
    env.sb.toString().should.equal("let PluginSpec: { props?: EditorProps | null }")
  });

  it('should handle a function', () => {
    let item = { type: "Function", params: [] };
    itemDef(env, item, "testFoo");
    env.sb.toString().should.equal("function testFoo(): void")
  })

  it('should handle an optional function', () => {
    let item = { type: "Function", optional: true, params: [] };
    itemDef(env, item, "testFoo");
    env.sb.toString().should.equal("let testFoo: (() => void) | null | undefined")
  });

});