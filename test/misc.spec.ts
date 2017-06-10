import {emptyEnvForTests} from "../src/env"
import {miscDef} from "../src/gendeclaration";


const env = emptyEnvForTests();

describe('when adding misc module definition', () => {

  it('should create a constructor', () => {
    let item = {id: "Plugin.constructor", name: "Plugin", type: "Function"};
    miscDef(env, item, "item1", { isInlineProp: false }).should.deep.equal([
      'constructor()'
    ])
  });

  it('should create a constructor with one parameter', () => {
    let item = { id: "Plugin.constructor", name: "Plugin", type: "Function", params: [{name: "spec", type: "PluginSpec"}] };
    miscDef(env, item, "item1", { isInlineProp: false }).should.deep.equal([
      'constructor(spec: PluginSpec)'
    ])
  });

  it('should create a constructor with two parameter', () => {
    let item = { id: "Plugin.constructor", name: "Plugin", type: "Function", params: [{ name: "spec", type: "PluginSpec" }, { name: "spec2", type: "number" }] };
    miscDef(env, item, "item1", { isInlineProp: false }).should.deep.equal([
      'constructor(spec: PluginSpec, spec2: number)'
    ])
  });


});
