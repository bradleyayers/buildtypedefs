import moduleDef from "../src/genmodule";


let cr = "\r\n";

describe('when adding module definition', () => {

  it('should create an empty module', () => {
    let module = {};
    let sb = moduleDef(module, "module1", {});
    sb.toString().should.equal('')
  });

  it('should create an module with one item', () => {
    let module = { items: {Class1: { type: "class"}} };
    let sb = moduleDef(module, "module1", {});
    sb.toString().should.equal('export class Class1 {' + cr + '};')
  });

  it('should replace additional type', () => {
    let module = { items: { RedNode: { type: "class", extends: { type: "Node" } }} };
    let additionalTypes = { "Node": { replaceBy: "ProsemirrorNode", definedIn: "prosemirror-model" }};
    let sb = moduleDef(module, "module1", additionalTypes);
    sb.toString().should.equal('import { ProsemirrorNode } from \'prosemirror-model\';' + cr + cr + 'export class RedNode extends ProsemirrorNode {' + cr + '};')
  });

});