import moduleDef from "../src/genmodule";

describe('when adding module definition', () => {

  it('should create an empty module', () => {
    const module = {};
    moduleDef(module, "module1", {}).should.deep.equal([])
  });

  it('should create an module with one item', () => {
    const module = { items: {Class1: { type: "class"}} };
    moduleDef(module, "module1", {}).should.deep.equal([
      "export declare class Class1 {",
      "}"
    ])
  });

  it('should import types', () => {
    const module = { items: { SpecialEditorProps: { type: "class", extends: { type: "EditorProps" } }} };
    const additionalTypes = { "EditorProps": { definedIn: "prosemirror-view" }};
    moduleDef(module, "module1", additionalTypes).should.deep.equal([
      "import { EditorProps } from 'prosemirror-view';",
      "",
      "export declare class SpecialEditorProps extends EditorProps {",
      "}"
    ])
  })

  it('should replace additional type', () => {
    const module = { items: { RedNode: { type: "class", extends: { type: "Node" } }} };
    const additionalTypes = { "Node": { replaceBy: "ProsemirrorNode", definedIn: "prosemirror-model" }};
    moduleDef(module, "module1", additionalTypes).should.deep.equal([
      "import { Node as ProsemirrorNode } from 'prosemirror-model';",
      "",
      "export declare class RedNode extends ProsemirrorNode {",
      "}"
    ])
  });

  it('should export with renaming', () => {
    const module = { items: { Node: { type: "class" }} };
    const additionalTypes = { "Node": { replaceBy: "ProsemirrorNode" }};
    moduleDef(module, "module1", additionalTypes).should.deep.equal([
      "declare class ProsemirrorNode {",
      "}",
      "export { ProsemirrorNode as Node }"
    ])
  });

});