import { Path, ASTType } from './types';

/**
 * Returns the closest ancestor of a given type from a given path, or undefined.
 *
 * `parentPath` is used to traverse upwards.
 */
export function closestViaParentPath(path: Path, type: ASTType): Path | undefined {
  let parentPath = path.parentPath;
  while (parentPath && !type.check(parentPath.value)) {
    parentPath = parentPath.parentPath;
  }
  return parentPath;
}
