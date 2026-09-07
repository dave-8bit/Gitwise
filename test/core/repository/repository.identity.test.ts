import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { resolveRepositoryIdentity } from '../../../src/core/repository/repository.identity';
import { getCurrentHeadRevision } from '../../../src/utils/git';

const temporaryRoots: string[] = [];

function makeRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gritch-repository-'));
  temporaryRoots.push(root);
  return root;
}

function runGit(root: string, args: string[]): string {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function initializeGitRepository(root: string): void {
  runGit(root, ['init']);
  runGit(root, ['config', 'user.name', 'Gritch Test']);
  runGit(root, ['config', 'user.email', 'gritch-test@example.invalid']);
}

afterEach(() => {
  while (temporaryRoots.length > 0) {
    fs.rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
  }
});

describe('repository identity', () => {
  it('resolves a repository root to an absolute self-keyed identity', () => {
    const root = makeRoot();
    initializeGitRepository(root);

    const identity = resolveRepositoryIdentity(root);

    expect(identity.root).toBe(path.resolve(root));
    expect(identity.key).toBe(identity.root);
    expect(path.isAbsolute(identity.root)).toBe(true);
  });

  it('resolves a nested path to the same identity as the repository root', () => {
    const root = makeRoot();
    initializeGitRepository(root);
    const nested = path.join(root, 'src', 'deep');
    fs.mkdirSync(nested, { recursive: true });

    expect(resolveRepositoryIdentity(nested)).toEqual(resolveRepositoryIdentity(root));
  });

  it('resolves equivalent path representations consistently', () => {
    const root = makeRoot();
    initializeGitRepository(root);
    const nested = path.join(root, 'src');
    fs.mkdirSync(nested);

    expect(resolveRepositoryIdentity(path.join(root, 'src', '..'))).toEqual(
      resolveRepositoryIdentity(root),
    );
    expect(resolveRepositoryIdentity(nested)).toEqual(resolveRepositoryIdentity(path.resolve(nested)));
  });

  it('preserves the existing absolute fallback for a non-Git directory', () => {
    const root = makeRoot();

    expect(resolveRepositoryIdentity(root)).toEqual({
      root: path.resolve(root),
      key: path.resolve(root),
    });
  });

  it('produces different keys for different repositories', () => {
    const first = makeRoot();
    const second = makeRoot();
    initializeGitRepository(first);
    initializeGitRepository(second);

    expect(resolveRepositoryIdentity(first).key).not.toBe(resolveRepositoryIdentity(second).key);
  });

  it('uses the supplied path rather than the caller current working directory', () => {
    const root = makeRoot();
    initializeGitRepository(root);
    const identity = resolveRepositoryIdentity(root);

    expect(identity.root).toBe(path.resolve(root));
    expect(identity.root).not.toBe(path.resolve(process.cwd()));
  });
});

describe('current HEAD revision', () => {
  it('returns the HEAD SHA for a repository with a commit', async () => {
    const root = makeRoot();
    initializeGitRepository(root);
    fs.writeFileSync(path.join(root, 'file.txt'), 'content\n');
    runGit(root, ['add', 'file.txt']);
    runGit(root, ['commit', '-m', 'initial commit']);

    const expected = runGit(root, ['rev-parse', 'HEAD']);
    expect(await getCurrentHeadRevision(root)).toBe(expected);
  });

  it('returns undefined for a non-Git directory or unborn branch', async () => {
    const nonGitRoot = makeRoot();
    expect(await getCurrentHeadRevision(nonGitRoot)).toBeUndefined();

    const unbornRoot = makeRoot();
    initializeGitRepository(unbornRoot);
    expect(await getCurrentHeadRevision(unbornRoot)).toBeUndefined();
  });

  it('resolves a nested path before reading HEAD', async () => {
    const root = makeRoot();
    initializeGitRepository(root);
    fs.writeFileSync(path.join(root, 'file.txt'), 'content\n');
    runGit(root, ['add', 'file.txt']);
    runGit(root, ['commit', '-m', 'initial commit']);
    const nested = path.join(root, 'src', 'deep');
    fs.mkdirSync(nested, { recursive: true });

    expect(await getCurrentHeadRevision(nested)).toBe(runGit(root, ['rev-parse', 'HEAD']));
  });
});