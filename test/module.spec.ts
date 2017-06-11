import moduleDef from "../src/genmodule";


describe('when adding module definition', () => {

  it('should create an empty module', () => {
    let module = {};
    moduleDef(module, "module1", {}).should.deep.equal([])
  });

  it('should create an module with one item', () => {
    let module = { items: {Class1: { type: "class"}} };
    moduleDef(module, "module1", {}).should.deep.equal([
      "export class Class1 {",
      "}"
    ])
  });

  it('should replace additional type', () => {
    let module = { items: { RedNode: { type: "class", extends: { type: "Node" } }} };
    let additionalTypes = { "Node": { replaceBy: "ProsemirrorNode", definedIn: "prosemirror-model" }};
    moduleDef(module, "module1", additionalTypes).should.deep.equal([
      "import { ProsemirrorNode } from 'prosemirror-model';",
      "",
      "export class RedNode extends ProsemirrorNode {",
      "}"
    ])
  });

});