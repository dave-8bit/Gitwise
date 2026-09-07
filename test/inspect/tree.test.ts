import { describe, expect, it } from 'vitest';

import { buildRepositoryTree } from '../../src/inspect/tree';

describe('repository tree projection', () => {
  it('builds and sorts a nested tree independently of input order', () => {
    const first = buildRepositoryTree([
      { path: 'src/z.ts' },
      { path: 'README.md' },
      { path: 'src/commands/review.ts' },
      { path: 'src/index.ts' },
      { path: 'src/commands/doctor.ts' },
      { path: 'docs/guide.v1.md' },
    ]);
    const second = buildRepositoryTree([
      { path: 'docs/guide.v1.md' },
      { path: 'src/commands/doctor.ts' },
      { path: 'src/index.ts' },
      { path: 'src/commands/review.ts' },
      { path: 'README.md' },
      { path: 'src/z.ts' },
    ]);

    expect(first).toEqual(second);
    expect(first.children.map((node) => `${node.kind}:${node.name}`)).toEqual([
      'directory:docs',
      'directory:src',
      'file:README.md',
    ]);
    expect(first.children[1].children.map((node) => node.name)).toEqual(['commands', 'index.ts', 'z.ts']);
    expect(first.children[1].children[0].children.map((node) => node.name)).toEqual(['doctor.ts', 'review.ts']);
  });

  it('normalizes Windows and mixed separators while preserving names', () => {
    const tree = buildRepositoryTree([
      { path: 'src\\commands/space name.ts' },
      { path: 'docs\\guide.v1.md' },
    ]);

    expect(tree.children[0].children[0].name).toBe('guide.v1.md');
    expect(tree.children[1].children[0].children[0].name).toBe('space name.ts');
  });

  it('handles empty and duplicate normalized paths', () => {
    expect(buildRepositoryTree([])).toEqual({ children: [] });
    expect(buildRepositoryTree([{ path: 'src/index.ts' }, { path: 'src\\index.ts' }])).toEqual({
      children: [{
        name: 'src',
        kind: 'directory',
        children: [{ name: 'index.ts', kind: 'file', children: [] }],
      }],
    });
  });

  it('creates intermediate directories and rejects file-directory conflicts', () => {
    const tree = buildRepositoryTree([{ path: 'a/b/c.txt' }]);
    expect(tree.children[0].children[0].children[0].name).toBe('c.txt');
    expect(() => buildRepositoryTree([{ path: 'a' }, { path: 'a/b.txt' }])).toThrow('Conflicting repository tree path');
  });
});
