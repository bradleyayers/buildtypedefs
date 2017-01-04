import * as j from 'jscodeshift';
import { Path, Spec, MethodSpec, PropertySpec, SpecKind } from './types';
import invariant from './invariant';
import { closestViaParentPath } from './traverse';

export function extractMethod(commentPath: Path): MethodSpec | undefined {
  const methodDefinitionPath = closestViaParentPath(commentPath, j.MethodDefinition);
  if (methodDefinitionPath) {
    const classDeclarationPath = closestViaParentPath(methodDefinitionPath, j.ClassDeclaration);
    invariant(!!classDeclarationPath, 'Expected method to be in a class declaration.');
    const spec = stripCommentSpecPrefix(commentPath.value.value);

    const functionDefinition = methodDefinitionPath.value.value;
    const paramNames = functionDefinition.params.map(node => {
      switch (node.type) {
        case 'Identifier': // foo(bar) {}
          return node.name;
        case 'AssignmentPattern': // foo(bar = 1) {}
          return node.left.name;
      }
    });

    return {
      kind: SpecKind.Method,
      name: methodDefinitionPath.value.key.name,
      spec,
      parent: classDeclarationPath.value.id.name,
      paramNames,
    }
  }
}

export function extractProperty(commentPath: Path): PropertySpec | undefined {
  const classDeclaration = closestViaParentPath(commentPath, j.ClassDeclaration);
  const methodDefinition = closestViaParentPath(commentPath, j.MethodDefinition);
  const expressionStatement = closestViaParentPath(commentPath, j.ExpressionStatement);
  if (classDeclaration && methodDefinition && expressionStatement) {
    const propertyName = j(expressionStatement)
      .find(j.ThisExpression)
      .paths()[0]
      .parent.value // MemberExpression (this.foo)
      .property.name; // foo

    const spec = stripCommentSpecPrefix(commentPath.value.value);
    return {
      kind: SpecKind.Property,
      name: propertyName,
      spec,
      parent: classDeclaration.value.id.name
    };
  }
}

/**
 * Strip off the ' :: ' or ' : ' prefix.
 */
function stripCommentSpecPrefix(prefixedSpec: string): string {
  const rawCommentSpec = prefixedSpec;
  const [matched, prefix, spec] = rawCommentSpec.match(/^( ::? )?(.*)$/);
  invariant(!!matched, `Invalid comment spec syntax '${prefixedSpec}'.`)
  return spec;
}

export interface Declaration {
  name?: string;
  typeSpec?: string;
  properties?: Declaration[];
}

export function extract(source: string): Declaration[] {
  const declarations = [];
  const nodeToDeclarationMap = [] as { path: any; declaration: Declaration }[];
  const program = j(source);

  interface DeclarationLine {
    kind: 'DeclarationLine';
    identifier?: string;
    indent: number;
    typeSpec: string;
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

  gatherComments().reverse().forEach(parseComment);
  return declarations;

  function parseLine(line: string): Line {
    let result;

    // Test for a DeclarationLine.
    result = line.match(/^( +)([a-zA-Z\._]*)(::?-? *)(.*)$/);
    if (result) {
      const [_, indent, identifier, colons, spec] = result;
      const line: DeclarationLine = {
        kind: 'DeclarationLine',
        indent: indent.length,
        typeSpec: spec
      };
      if (identifier) {
        line.identifier = identifier;
      }
      return line;
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

  function parseComment(comments: CommentBlock) {
    const lines = comments.lines.map(parseLine);
    const end = lines.length;
    let pos = 0;
    let line = lines[pos];

    while (line) {
      switch (line.kind) {
        case 'DeclarationLine':
          const declarationLine = line;
          const declaration = parseDeclaration();
          let parentDeclaration = findParentDeclaration(comments.associatedNodePath);
          if (!parentDeclaration) {
            const classDeclarations = j(comments.associatedNodePath).closest(j.ClassDeclaration).paths();
            if (classDeclarations.length === 1) {
              const classDeclaration = classDeclarations[0];
              parentDeclaration = {
                name: nameFromPath(classDeclaration),
                typeSpec: typeSpecFromPath(classDeclaration)
              };
              declarations.push(parentDeclaration);
              nodeToDeclarationMap.push({ path: classDeclaration, declaration: parentDeclaration });
            }
          }

          if (parentDeclaration) {
            parentDeclaration.properties = parentDeclaration.properties || [];
            parentDeclaration.properties.push(declaration);
          } else {
            declarations.push(declaration);
          }
          nodeToDeclarationMap.push({
            path: comments.associatedNodePath,
            declaration
          });
          break;
        case 'DocumentationLine':
        case 'EmptyLine':
          nextLine();
          break;
      }
    }

    function findParentDeclaration(p: any): Declaration | undefined {
      for (const { path, declaration } of nodeToDeclarationMap) {
        let parent = p;
        while (parent = parent.parentPath) {
          if (parent === path) {
            return declaration;
          }
        }
      }
    }

    function nameFromPath(path: any): string {
      const node = path.node;
      switch (node.type) {
        case 'ClassDeclaration':
          return node.id.name;
        case 'MethodDefinition':
          return node.key.name;
        default:
          throw new Error(`Unable to derive declaration name from a '${node.type}'.`);
      }
    }

    function typeSpecFromPath(path: any): string {
      switch (path.value.type) {
        case 'ClassDeclaration':
          return 'class';
        default:
          throw new Error(`Unable to derive declaration type from a '${path.value.type}'.`);
      }
    }

    function parseDeclaration(): Declaration {
      const { typeSpec, identifier, indent } = line as DeclarationLine;
      const declaration: Declaration = {}

      // A declaration without a name implicitly applies to the next
      // program element. We derive the name based on that.
      declaration.name = identifier || nameFromPath(comments.associatedNodePath);
      declaration.typeSpec = typeSpec || typeSpecFromPath(comments.associatedNodePath);

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

    return commentsPaths.map(commentsPath => {
      const lines = j(commentsPath).find(j.Comment).nodes().map(node => node.value);
      const associatedNodePath = commentsPath.parentPath;
      return { lines, associatedNodePath };
    });
  }

  interface CommentBlock {
    lines: string[];
    associatedNodePath: any;
  }
}

