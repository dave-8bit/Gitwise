import fs from 'node:fs';

import { resolveRepoRoot } from '../../inspect/root';

export interface RepositoryIdentity {
  root: string;
  key: string;
}

function canonicalizeRoot(root: string): string {
  try {
    return fs.realpathSync.native(root);
  } catch {
    return root;
  }
}

/** Resolves a repository identity from the existing repository-root behavior. */
export function resolveRepositoryIdentity(inputPath?: string): RepositoryIdentity {
  const resolved = resolveRepoRoot(inputPath);
  const root = canonicalizeRoot(resolved.root);

  return { root, key: root };
}