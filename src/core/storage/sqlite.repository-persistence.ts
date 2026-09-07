import type Database from 'better-sqlite3';

import type { RepositoryIdentity } from '../repository/repository.identity';
import {
  InvalidRepositoryCacheError,
  type RepositoryPersistence,
  RepositoryPersistenceError,
} from '../repository/repository.persistence';
import {
  deserializeRepositorySnapshot,
  serializeRepositorySnapshot,
  type RepositorySnapshot,
} from '../repository/repository.snapshot';
import { migrateRepositoryDatabase } from './sqlite.migrations';

interface RepositorySnapshotRow {
  repository_key: unknown;
  root_path: unknown;
  source_revision: unknown;
  serialization_version: unknown;
  profile_json: unknown;
  captured_at: unknown;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === null || value === undefined || isString(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function validateRow(row: RepositorySnapshotRow): asserts row is {
  repository_key: string;
  root_path: string;
  source_revision: string | undefined;
  serialization_version: number;
  profile_json: string;
  captured_at: string;
} {
  if (!isString(row.repository_key) || !isString(row.root_path) ||
      !isOptionalString(row.source_revision) || !isInteger(row.serialization_version) ||
      !isString(row.profile_json) || !isString(row.captured_at)) {
    throw new InvalidRepositoryCacheError('Invalid repository snapshot database row');
  }
}

function persistenceFailure(operation: string, error: unknown): RepositoryPersistenceError {
  const message = error instanceof Error ? error.message : String(error);
  return new RepositoryPersistenceError(`Repository persistence ${operation} failed: ${message}`);
}

function closeDatabase(database: Database.Database): void {
  if (database.open) database.close();
}

export class SqliteRepositoryPersistence implements RepositoryPersistence {
  load(identity: RepositoryIdentity): RepositorySnapshot | undefined {
    let database: Database.Database;
    try {
      database = migrateRepositoryDatabase(identity.root);
    } catch (error) {
      throw persistenceFailure('load', error);
    }

    try {
      const row = database.prepare(`
        SELECT repository_key, root_path, source_revision,
               serialization_version, profile_json, captured_at
        FROM repository_snapshots
        WHERE repository_key = ?
      `).get(identity.key) as RepositorySnapshotRow | undefined;

      if (!row) return undefined;
      validateRow(row);

      let snapshot: RepositorySnapshot;
      try {
        snapshot = deserializeRepositorySnapshot(row.profile_json);
      } catch (error) {
        throw new InvalidRepositoryCacheError('Invalid repository snapshot data');
      }

      if (
        snapshot.identity.root !== row.root_path ||
        snapshot.identity.key !== row.repository_key ||
        (snapshot.sourceRevision ?? null) !== row.source_revision ||
        snapshot.serializationVersion !== row.serialization_version ||
        snapshot.capturedAt !== row.captured_at ||
        snapshot.identity.root !== identity.root ||
        snapshot.identity.key !== identity.key
      ) {
        throw new InvalidRepositoryCacheError('Repository snapshot does not match its database row');
      }

      return snapshot;
    } catch (error) {
      if (error instanceof InvalidRepositoryCacheError) throw error;
      throw persistenceFailure('load', error);
    } finally {
      closeDatabase(database);
    }
  }

  save(snapshot: RepositorySnapshot): void {
    let profileJson: string;
    try {
      profileJson = serializeRepositorySnapshot(snapshot);
    } catch (error) {
      throw new InvalidRepositoryCacheError('Cannot save invalid repository snapshot');
    }

    let database: Database.Database;
    try {
      database = migrateRepositoryDatabase(snapshot.identity.root);
    } catch (error) {
      throw persistenceFailure('save', error);
    }

    try {
      const replace = database.transaction(() => {
        database.prepare(`
          INSERT INTO repository_snapshots (
            repository_key, root_path, source_revision,
            serialization_version, profile_json, captured_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(repository_key) DO UPDATE SET
            root_path = excluded.root_path,
            source_revision = excluded.source_revision,
            serialization_version = excluded.serialization_version,
            profile_json = excluded.profile_json,
            captured_at = excluded.captured_at
        `).run(
          snapshot.identity.key,
          snapshot.identity.root,
          snapshot.sourceRevision ?? null,
          snapshot.serializationVersion,
          profileJson,
          snapshot.capturedAt,
        );
      });

      replace();
    } catch (error) {
      throw persistenceFailure('save', error);
    } finally {
      closeDatabase(database);
    }
  }

  clear(identity: RepositoryIdentity): void {
    let database: Database.Database;
    try {
      database = migrateRepositoryDatabase(identity.root);
    } catch (error) {
      throw persistenceFailure('clear', error);
    }

    try {
      database.prepare('DELETE FROM repository_snapshots WHERE repository_key = ?').run(identity.key);
    } catch (error) {
      throw persistenceFailure('clear', error);
    } finally {
      closeDatabase(database);
    }
  }
}
