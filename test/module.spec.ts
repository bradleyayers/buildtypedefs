import moduleDef from "../src/genmodule";


let cr = "\r\n";

describe('when adding module definition', () => {

  it('should create an empty module', () => {
    let module = {};
    let sb = moduleDef(module, "module1", {}, {});
    sb.toString().should.equal('declare module "module1" {' + cr + '}')
  });

  it('should create an module with one item', () => {
    let module = { items: {Class1: { type: "class"}} };
    let sb = moduleDef(module, "module1", {}, {});
    sb.toString().should.equal('declare module "module1" {' + cr + '  export class Class1 {' + cr + '  }' + cr + '}')
  });

  it('should replace additional type', () => {
    let module = { items: { Node: { type: "class"}} };
    let additionalTypes = {"Node": { replacement: "ProsemirrorNode", source: "prosemirror-model"}};
    let sb = moduleDef(module, "module1", {}, additionalTypes);
    sb.toString().should.equal('declare module "module1" {' + cr + '  export class Class1 { ' + cr + '  }' + cr + '}')
  });

});