import type { InventoryEntry } from './types';

export interface RepositoryTreeNode {
  name: string;
  kind: 'directory' | 'file';
  children: RepositoryTreeNode[];
}

export interface RepositoryTree {
  children: RepositoryTreeNode[];
}

function normalizePath(filePath: string): string {
  return filePath.replace(/[\\/]+/g, '/');
}

function sortNodes(nodes: RepositoryTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });

  for (const node of nodes) {
    if (node.kind === 'directory') sortNodes(node.children);
  }
}

export function buildRepositoryTree(files: readonly InventoryEntry[]): RepositoryTree {
  const tree: RepositoryTree = { children: [] };

  for (const file of files) {
    const segments = normalizePath(file.path).split('/').filter(Boolean);
    if (segments.length === 0) continue;

    let children = tree.children;
    for (let index = 0; index < segments.length; index++) {
      const name = segments[index];
      const isFile = index === segments.length - 1;
      const kind = isFile ? 'file' : 'directory';
      const existing = children.find((node) => node.name === name);

      if (existing) {
        if (existing.kind !== kind) {
          throw new Error(`Conflicting repository tree path: ${file.path}`);
        }
        if (isFile) break;
        children = existing.children;
        continue;
      }

      const node: RepositoryTreeNode = { name, kind, children: [] };
      children.push(node);
      if (!isFile) children = node.children;
    }
  }

  sortNodes(tree.children);
  return tree;
}
