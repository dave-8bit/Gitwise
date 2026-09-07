import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  getRepositoryDatabasePath,
  openRepositoryDatabase,
} from '../../../src/core/storage/sqlite.connection';

const temporaryRoots: string[] = [];

function makeRepositoryRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gritch-sqlite-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  while (temporaryRoots.length > 0) {
    fs.rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
  }
});

describe('sqlite connection', () => {
  it('creates .gritch and the database lazily at the repository root', () => {
    const root = makeRepositoryRoot();
    const gritchDirectory = path.join(root, '.gritch');

    expect(fs.existsSync(gritchDirectory)).toBe(false);

    const database = openRepositoryDatabase(root);

    expect(fs.existsSync(gritchDirectory)).toBe(true);
    expect(fs.existsSync(getRepositoryDatabasePath(root))).toBe(true);
    expect(database.open).toBe(true);
    database.close();
  });

  it('opens an existing database', () => {
    const root = makeRepositoryRoot();
    const first = openRepositoryDatabase(root);
    first.exec('CREATE TABLE test_values (value TEXT NOT NULL)');
    first.prepare('INSERT INTO test_values (value) VALUES (?)').run('stored');
    first.close();

    const second = openRepositoryDatabase(root);
    const row = second.prepare('SELECT value FROM test_values').get() as { value: string };

    expect(row.value).toBe('stored');
    second.close();
  });

  it('allows multiple opens of the same database and closes independently', () => {
    const root = makeRepositoryRoot();
    const first = openRepositoryDatabase(root);
    const second = openRepositoryDatabase(root);

    first.exec('CREATE TABLE shared_values (value TEXT NOT NULL)');
    first.prepare('INSERT INTO shared_values (value) VALUES (?)').run('shared');

    const row = second.prepare('SELECT value FROM shared_values').get() as { value: string };
    expect(row.value).toBe('shared');

    first.close();
    expect(second.open).toBe(true);
    second.close();
  });

  it('uses different database files for different repository roots', () => {
    const firstRoot = makeRepositoryRoot();
    const secondRoot = makeRepositoryRoot();
    const first = openRepositoryDatabase(firstRoot);
    const second = openRepositoryDatabase(secondRoot);

    expect(getRepositoryDatabasePath(firstRoot)).not.toBe(getRepositoryDatabasePath(secondRoot));
    expect(fs.existsSync(getRepositoryDatabasePath(firstRoot))).toBe(true);
    expect(fs.existsSync(getRepositoryDatabasePath(secondRoot))).toBe(true);

    first.close();
    second.close();
  });

  it('does not create a database outside the repository root', () => {
    const root = makeRepositoryRoot();
    const database = openRepositoryDatabase(root);

    expect(fs.existsSync(path.join(root, 'repository.sqlite'))).toBe(false);
    expect(path.dirname(getRepositoryDatabasePath(root))).toBe(path.join(root, '.gritch'));
    database.close();
  });

  it('closes the connection and rejects subsequent database operations', () => {
    const root = makeRepositoryRoot();
    const database = openRepositoryDatabase(root);

    database.close();

    expect(database.open).toBe(false);
    expect(() => database.exec('CREATE TABLE closed_table (value TEXT)')).toThrow();
  });

  it('reports a clear error when the database cannot be opened', () => {
    const rootFile = path.join(makeRepositoryRoot(), 'repository-root-file');
    fs.writeFileSync(rootFile, 'not a directory');

    expect(() => openRepositoryDatabase(rootFile)).toThrow(
      /Could not open repository database at .*repository-root-file.*repository\.sqlite/,
    );
  });
});