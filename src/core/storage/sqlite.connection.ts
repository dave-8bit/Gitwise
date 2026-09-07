import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const GRITCH_DIRECTORY = '.gritch';
const DATABASE_FILENAME = 'repository.sqlite';

export function getRepositoryDatabasePath(repositoryRoot: string): string {
  return path.join(path.resolve(repositoryRoot), GRITCH_DIRECTORY, DATABASE_FILENAME);
}

/** Opens the repository-local SQLite database, creating its directory lazily. */
export function openRepositoryDatabase(repositoryRoot: string): Database.Database {
  const databasePath = getRepositoryDatabasePath(repositoryRoot);
  const databaseDirectory = path.dirname(databasePath);

  try {
    fs.mkdirSync(databaseDirectory, { recursive: true });
    const database = new Database(databasePath);
    database.pragma('journal_mode = WAL');
    database.pragma('synchronous = NORMAL');
    return database;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not open repository database at ${databasePath}: ${message}`);
  }
}