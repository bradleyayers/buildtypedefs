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
    const [ matched, prefix, spec] = rawCommentSpec.match(/^( ::? )?(.*)$/);
    invariant(!!matched, `Invalid comment spec syntax '${}'.`)
    return spec;
}
