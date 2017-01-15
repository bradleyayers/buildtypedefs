import * as j from 'jscodeshift';
import { Path, Spec, MethodSpec, PropertySpec, SpecKind } from './types';
import invariant from './invariant';
import { closestViaParentPath } from './traverse';
import { parse, TypeNode, FunctionParameterTypeNode, ObjectMemberTypeNode } from './getdocs/parser';

export interface ClassTypeNode {
  kind: 'Class';
  constructorParameters?: FunctionParameterTypeNode[];
  staticProperties?: Declaration[];
  superClass?: string;
}

export interface InterfaceTypeNode {
  kind: 'Interface';
}

export interface StaticPropertyDescriptor {
  className: string;
  propertyName: string
}

export type ProgramTypeNode = ClassTypeNode | InterfaceTypeNode | TypeNode;

export interface Declaration {
  name?: string;
  typeSpec?: string;
  type?: ProgramTypeNode;
  properties?: Declaration[];
  exported?: boolean;
  staticPropertyOf?: string;
}

export function extract(source: string): Declaration[] {
  const declarations: Declaration[] = [];
  const nodeToDeclarationMap = [] as { nodePath: any; nodeDeclaration: Declaration }[];
  const program = j(source);

  interface DeclarationLine {
    kind: 'DeclarationLine';
    identifier?: string;
    indent: number;
    typeSpec?: string;
  }

  interface DocumentationLine {
    kind: 'DocumentationLine';
    text: string;
    indent: number;
  }

  interface EmptyLine {
    kind: 'EmptyLine';
    indent: number;
  }

  type Line = DeclarationLine | DocumentationLine | EmptyLine;

  gatherComments().forEach(parseComments);

  loop: for (let i = declarations.length - 1; i >= 0; i--) {
    const declaration = declarations[i];
    if (declaration.staticPropertyOf) {
      for (const { nodePath, nodeDeclaration } of nodeToDeclarationMap) {
        if (nodePath.node.type === 'ExpressionStatement'
            && nodePath.node.expression.type === 'AssignmentExpression'
            && nodePath.node.expression.left.object.type === 'Identifier'
            && nodePath.parent.node.type === 'Program') {
          const objectName = nodePath.node.expression.left.object.name;
          for (const existingDeclaration of declarations) {
            if (existingDeclaration.name === objectName) {
              if (existingDeclaration.type.kind === 'Name' && existingDeclaration.type.name === 'Object') {
                console.warn(`Found explicit ObjectMember: converting ${existingDeclaration.name}.${objectName} from type '${existingDeclaration.type.kind}' to 'Object'.`);
                existingDeclaration.type = {
                  kind: 'Object',
                  members: []
                };
                delete existingDeclaration.typeSpec;
              }

              if (existingDeclaration.type.kind !== 'Object') {
                console.warn(`Found parent declaration candidate for ${nodeDeclaration.name}, by the type was '${existingDeclaration.type.kind}' rather than 'Object'.`);
              } else {
                existingDeclaration.type.members.push({
                  kind: 'ObjectMember',
                  name: declaration.name,
                  type: declaration.type
                } as ObjectMemberTypeNode);
                declarations.splice(i, 1);
              }
              continue loop;
            }
          }
        }
      }
      throw new Error(`Unable to find a container '${declaration.staticPropertyOf}' for static property '${declaration.name}'.`)
    }
  }

  return declarations.reverse();

  function parseLine(line: string): Line {
    let result;

    // Test for a DeclarationLine.
    result = line.match(/^( +)([a-zA-Z\._]*)(::-|::|:|;;)(?: *)([^#]*)(?: #path=\w+\.prototype\.)?(\w+)?$/);
    if (result) {
      const [_, indent, identifier, separator, spec, pathIdentifier] = result;

      // guard against `// includes:`
      const isDocumentation = (identifier && separator === ':');

      if (!isDocumentation) {
        const line: DeclarationLine = {
          kind: 'DeclarationLine',
          indent: indent.length
        };
        const isSpecSeparator = separator === ':' || separator === '::';
        if (spec && isSpecSeparator) {
          line.typeSpec = spec;
        }
        const name = identifier || pathIdentifier;
        if (name) {
          line.identifier = name;
        }
        return line;
      }
    }

    // Test for a DocumentationLine.
    result = line.match(/^( +)(.+)$/);
    if (result) {
      const [_, indent, text] = result;
      return {
        kind: 'DocumentationLine',
        indent: indent.length,
        text
      }
    }

    // Test for an EmptyLine.
    result = line.match(/^( *)$/);
    if (result) {
      const [_, indent] = result;
      return {
        kind: 'EmptyLine',
        indent
      };
    }
    throw new Error(`Unknown syntax in comment: ${line}`);
  }

  function isIdentifierExported(identifier: string): boolean {
    const identifierPaths = program.find(j.Identifier).paths();
    for (const identifierPath of identifierPaths) {
      if (identifierPath.node.name === 'exports' &&
        identifierPath.parent.node.type === 'MemberExpression' &&
        identifierPath.parent.node.property.name === identifier) {
        return true;
      }
    }
    return false;
  }

  function parseComments(comments: CommentBlock) {
    const lines = comments.lines.map(parseLine);
    const end = lines.length;
    let pos = 0;
    let line = lines[pos];

    const declarationsInsertionPoint = declarations.length - 1;
    function pushDeclaration(declaration: Declaration) {
      // declarations.splice(declarationsInsertionPoint, 0, declaration);
      declarations.push(declaration);
    }

    while (line) {
      switch (line.kind) {
        case 'DeclarationLine':
          const declarationLine = line;
          const declaration = parseDeclaration();
          let parentDeclaration = findDeclaredParent(comments.associatedNodePath);
          if (!parentDeclaration) {
            const classDeclarations = j(comments.associatedNodePath).closest(j.ClassDeclaration).paths();
            if (classDeclarations.length === 1) {
              const classDeclaration = classDeclarations[0];
              const name = nameFromPath(classDeclaration)
              parentDeclaration = {
                name,
                type: typeFromPath(classDeclaration),
                exported: isIdentifierExported(name),
              };
              if (classDeclaration.node.superClass) {
                if (parentDeclaration.type.kind === 'Class') {
                  parentDeclaration.type.superClass = classDeclaration.node.superClass.name;
                }
              }
              pushDeclaration(parentDeclaration);
              nodeToDeclarationMap.push({ nodePath: classDeclaration, nodeDeclaration: parentDeclaration });
            }
          }

          if (parentDeclaration) {
            if (parentDeclaration.type.kind === 'Class' && comments.associatedNodePath.node.type === 'Property') {
              const propertyName = comments.associatedNodePath.parent.parent.value.left.property.name;
              for (const property of parentDeclaration.properties) {
                if (property.name === propertyName) {
                  if (property.type.kind !== 'Object') {
                    console.warn(`Found explicit ObjectMember: converting ${parentDeclaration.name}.${propertyName} from type '${property.type.kind}' to 'Object'.`)
                    property.type = {
                      kind: 'Object',
                      members: [],
                    };
                    delete property.typeSpec;
                  }
                  property.type.members.splice(0, 0, {
                    kind: 'ObjectMember',
                    name: declaration.name,
                    type: declaration.type
                  } as ObjectMemberTypeNode);
                }
              }
              comments.associatedNodePath.parent.node.type
            } else if (declaration.type.kind === 'Function' && declaration.name === 'constructor' && parentDeclaration.type.kind === 'Class') {
              parentDeclaration.type.constructorParameters = declaration.type.parameters;
            } else if (declaration.type.kind === 'Function' && parentDeclaration.type.kind === 'Class' && comments.associatedNodePath.node.static) {
              parentDeclaration.type.staticProperties = parentDeclaration.type.staticProperties || [];
              parentDeclaration.type.staticProperties.splice(0, 0, declaration);
            } else {
              parentDeclaration.properties = parentDeclaration.properties || [];
              parentDeclaration.properties.splice(0, 0, declaration);
            }
          } else {
            if (declaration.type.kind === 'Interface') {
              declaration.exported = true;
            } else {
              if (comments.associatedNodePath.value.type !== 'Program') {
                declaration.exported = isIdentifierExported(declaration.name);
              }
              if (comments.associatedNodePath.node.superClass) {
                if (declaration.type.kind === 'Class') {
                  declaration.type.superClass = comments.associatedNodePath.node.superClass.name;
                }
              }
              for (let i = declarations.length - 1; i >= 0; i--) {
                const existingDeclaration = declarations[i];
                if (existingDeclaration.staticPropertyOf === declaration.name) {
                  if (declaration.type.kind === 'Class') {
                    declaration.type.staticProperties = declaration.type.staticProperties || [];
                    declaration.type.staticProperties.push(existingDeclaration);
                    delete existingDeclaration.staticPropertyOf;
                    declarations.splice(i, 1);
                  }
                }
              }
            }
            pushDeclaration(declaration);
          }
          if (comments.associatedNodePath.value.type !== 'Program') {
            nodeToDeclarationMap.push({
              nodePath: comments.associatedNodePath,
              nodeDeclaration: declaration
            });
          }
          break;
        case 'DocumentationLine':
        case 'EmptyLine':
          nextLine();
          break;
      }
    }

    function findDeclaredParent(p: any): Declaration | undefined {
      for (const { nodePath, nodeDeclaration } of nodeToDeclarationMap) {
        let parent = p;
        while (parent = parent.parentPath) {
          if (parent === nodePath) {
            return nodeDeclaration;
          }
        }
      }
    }

    function nameFromPath(path: any): string {
      const node = path.node;
      switch (node.type) {
        case 'ClassDeclaration':
        case 'FunctionDeclaration':
          return node.id.name;
        case 'MethodDefinition':
          return node.key.name;
        case 'ExpressionStatement':
          // We expect to handle two ExpressionStatement cases:
          //
          // - a constructor ivar setter -- this.foo = 'bar'
          // - a static class property -- Foo.foo = 'bar'
          const thisExpressionPaths = j(node).find(j.ThisExpression).paths();
          if (thisExpressionPaths.length) {
            if (!thisExpressionPaths[0].parent.value.property.name) debugger;
            return thisExpressionPaths[0]
              .parent.value // MemberExpression (this.foo)
              .property.name; // foo
          }
          const staticPropertyDescriptor = getStaticPropertyDescriptor(comments.associatedNodePath);
          if (staticPropertyDescriptor) {
            return staticPropertyDescriptor.propertyName;
          }
          break;
        case 'VariableDeclaration':
          if (node.declarations.length !== 1) {
            throw new Error('Unable to deal with a multi-variable declaration.');
          }
          return node.declarations[0].id.name;
        case 'Property':
          return node.key.name;
      }
      debugger;
      throw new Error(`Unable to derive declaration name from a '${node.type}'.`);
    }

    function typeFromPath(path: any): ProgramTypeNode {
      switch (path.value.type) {
        case 'ClassDeclaration':
          return { kind: 'Class' };
        case 'FunctionDeclaration':
          return {
            kind: 'Function',
            parameters: []
          }
        case 'VariableDeclaration':
          return { kind: 'Any' };
        default:
          debugger;
          throw new Error(`Unable to derive declaration type from a '${path.value.type}':\n${j(path).toSource()}`);
      }
    }

    function getStaticPropertyDescriptor(path: any): StaticPropertyDescriptor | undefined {
      const { node } = path;
      if (node.type === 'ExpressionStatement'
        && path.parent.node.type === 'Program'
        && node.expression.type === 'AssignmentExpression'
        && node.expression.left.type === 'MemberExpression') {
        const className = node.expression.left.object.name;
        const propertyName = node.expression.left.property.name;
        return { className, propertyName };
      }
    }

    function parseDeclaration(): Declaration {
      const { typeSpec, identifier, indent } = line as DeclarationLine;
      const declaration: Declaration = {}
      const staticPropertyDescriptor = getStaticPropertyDescriptor(comments.associatedNodePath);

      // A declaration without a name implicitly applies to the next
      // program element. We derive the name based on that.
      declaration.name = identifier || nameFromPath(comments.associatedNodePath);
      if (typeSpec) {
        declaration.typeSpec = typeSpec
        declaration.type = typeSpec === 'interface'
          ? { kind: 'Interface' }
          : parse(declaration.typeSpec);
      } else {
        declaration.type = typeFromPath(comments.associatedNodePath);
        if (declaration.type.kind === 'Class') {
          declaration.exported = isIdentifierExported(declaration.name);
        }
      }

      if (staticPropertyDescriptor) {
        declaration.staticPropertyOf = staticPropertyDescriptor.className
      }

      if (declaration.type.kind === 'Function') {
        // getdocs doesn't include parameter names for functions. Rather those are declared
        // in the source itself, so at this point we know we're dealing with a function, but
        // need to try and pull parameter names from the function node.
        //
        // To complicate the matter we might be dealing with a class method, or a function
        // declaration.
        const node = comments.associatedNodePath.value;

        // It's not always possible to find function parameter names, e.g.
        //
        //     // :: (string)
        //     Foo.bar = 1;
        //
        // In that example there is no function in the code to actually pull
        // parameter names from. It's not clear if it's an error, so we log
        // a warning and generate some parameter names.
        //
        // It's also possible for more parameters to be declared in the type
        // than in the code, so by default we start with a set of parameters
        // that are just numbered, i.e. _0, _1, _2. Then we check the code
        // to see if we can find better names.
        const params = declaration.type.parameters.map((_, i) => ({
          type: 'Identifier',
          name: `_${i}`
        }));

        let fromTheCodeParams = [];
        switch (node.type) {
          case 'MethodDefinition':
            fromTheCodeParams = node.value.params;
            break;
          case 'FunctionDeclaration':
            fromTheCodeParams = node.params;
            break;
          default:
            console.warn(`Unable to find function parameters from a '${node.type}', falling back to '_n'.`);
        }

        // Overlay the *real* params, to replace our placeholders.
        params.splice(0, fromTheCodeParams.length, ...fromTheCodeParams);

        const paramNames = params.map(node => {
          switch (node.type) {
            case 'Identifier': // foo(bar) {}
              return node.name;
            case 'AssignmentPattern': // foo(bar = 1) {}
              return node.left.name;
          }
        });
        for (let i = 0; i < declaration.type.parameters.length; i++) {
          if (!declaration.type.parameters[i].name) {
            declaration.type.parameters[i].name = paramNames[i];
          }
        }
      }

      // if (comments.associatedNodePath.value.type === 'Property') {
      //   declaration.type = {
      //     kind: 'ObjectMember',
      //     name: declaration.name,
      //     type: declaration.type,
      //   }
      // }

      if (comments.associatedNodePath.value.type === 'MethodDefinition') {
        while (line) nextLine();
      }

      skipUntil('EmptyLine');

      loop: while (line) {
        switch (line.kind) {
          case 'DocumentationLine':
            skipUntil('EmptyLine');
            break;
          case 'EmptyLine':
            nextLine();
            break;
          case 'DeclarationLine':
            if (line.indent > indent) {
              const properties = parseProperties();
              if (properties.length) {
                declaration.properties = properties;
              }
            }
            break loop;
        }
      }

      return declaration;
    }

    function parseProperties(): Declaration[] {
      const { indent } = line;
      const members = [];

      loop: while (line) {
        switch (line.kind) {
          case 'EmptyLine':
            nextLine();
            break;
          case 'DocumentationLine':
            if (line.indent >= indent) {
              throw new Error('Unexpected documentation line.');
            }
          case 'DeclarationLine':
            if (line.indent === indent) {
              members.push(parseDeclaration());
              break;
            } else if (line.indent < indent) {
              break loop;
            }
        }
      }

      return members;
    }

    function skipUntil(kind: string) {
      while (line && line.kind !== kind) {
        nextLine();
      }
    }

    function nextLine() {
      line = pos < end
        ? lines[++pos]
        : undefined;
      return line;
    }
  }

  /**
   * Extract groups of comments and their proceeding program element from a
   * program.
   *
   * This organisation of comments is convenient to work on for extracting
   * getdocs information.
   */
  function gatherComments(): CommentBlock[] {
    const commentsPaths = [];

    // The psuedo "comments" path only seems accessible via .parentPath on a
    // Comment path, so we're left with an inefficient algorithm here of
    // building a unique array of each Comment's .parentPath
    program.find(j.Comment).paths().forEach(commentPath => {
      const commentsPath = commentPath.parentPath;
      const lastCommentsPath = commentsPaths[commentsPaths.length - 1];
      if (commentsPath !== lastCommentsPath) {
        commentsPaths.push(commentsPath);
      }
    });

    // A comment block ignores empty lines between comments, which isn't what we want.
    //
    // For example there might be a comment block:
    //
    //     // Foo:: interface
    //     //
    //     //   foo:: number
    //
    //     // ::-
    //     class Bar {
    //       // bar:: string;
    //     }
    //
    // In this case we want Foo and Bar to be considered separately, and we definitely don't
    // want Foo associated with the class.
    const lineGroups = [];

    function pushLine(line: any) {
      lineGroups[lineGroups.length - 1].lines.push(line);
    }

    function getLastLineLocStartLine(): number {
      const lines = lineGroups[lineGroups.length - 1].lines;
      return lines[lines.length - 1].loc.start.line;
    }

    function startEmptyBlock(associatedNodePath: any) {
      lineGroups.push({ lines: [], associatedNodePath });
    }

    commentsPaths.reverse().forEach(commentsPath => {
      const lines = j(commentsPath).find(j.Comment).nodes();
      startEmptyBlock(commentsPath.parent);
      pushLine(lines[0]);

      let hasAssociatedNodeToGroup = false;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const isCommentSplit = getLastLineLocStartLine() !== line.loc.start.line - 1;
        if (isCommentSplit) {
          const isTrailingComment = line.loc.start.line > commentsPath.node.loc.end.line;
          if (isTrailingComment) {
            const lastLeadingComment = lineGroups[lineGroups.length - 1];
            lastLeadingComment.associatedNodePath = commentsPath.parentPath;
            hasAssociatedNodeToGroup = true;
            startEmptyBlock(commentsPath.parent);
          } else if (parseLine(line.value).kind === 'DeclarationLine') {
            startEmptyBlock(commentsPath.parent);
          }
        }
        pushLine(line);
      }

      if (!hasAssociatedNodeToGroup) {
        lineGroups[lineGroups.length - 1].associatedNodePath = commentsPath.parentPath;
      }
    });

    return lineGroups.map((lineGroup, index) => {
      const { lines, associatedNodePath } = lineGroup;
      return {
        lines: lines.map(line => line.value),
        associatedNodePath
      };
    });
  }

  interface CommentBlock {
    lines: string[];
    associatedNodePath?: any;
  }
}
