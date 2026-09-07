import { buildFileInventory } from '../inspect/inventory';
import { formatRepositoryTree } from '../inspect/formatter';
import { buildRepositoryTree } from '../inspect/tree';

export function treeCommand(rootPath?: string): void {
  const inventory = buildFileInventory({ rootPath });
  const tree = buildRepositoryTree(inventory.files);
  console.log(formatRepositoryTree(inventory.root, tree, 3));
}
