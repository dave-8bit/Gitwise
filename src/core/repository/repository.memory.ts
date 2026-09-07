import { getCurrentHeadRevision } from '../../utils/git';
import { inspectRepository, type RepositoryProfile } from '../../inspect/profile';
import { SqliteRepositoryPersistence } from '../storage/sqlite.repository-persistence';
import {
  InvalidRepositoryCacheError,
  RepositoryPersistenceError,
  type RepositoryPersistence,
} from './repository.persistence';
import { resolveRepositoryIdentity, type RepositoryIdentity } from './repository.identity';
import {
  CURRENT_SERIALIZATION_VERSION,
  type RepositorySnapshot,
} from './repository.snapshot';

export interface RepositoryMemory {
  getSnapshot(repositoryPath: string): Promise<RepositorySnapshot>;
  refresh(repositoryPath: string): Promise<RepositorySnapshot>;
}

export interface RepositoryMemoryDependencies {
  persistence: RepositoryPersistence;
  inspect: (repositoryPath: string) => RepositoryProfile;
  resolveIdentity: (repositoryPath: string) => RepositoryIdentity;
  getSourceRevision: (repositoryPath: string) => Promise<string | undefined>;
}

export type RepositoryMemoryOptions = Partial<RepositoryMemoryDependencies>;

function matchesCurrentRepository(
  snapshot: RepositorySnapshot,
  identity: RepositoryIdentity,
  sourceRevision: string | undefined,
): boolean {
  return snapshot.identity.root === identity.root &&
    snapshot.identity.key === identity.key &&
    snapshot.sourceRevision === sourceRevision &&
    snapshot.serializationVersion === CURRENT_SERIALIZATION_VERSION;
}

export class RepositoryMemoryCoordinator implements RepositoryMemory {
  private readonly dependencies: RepositoryMemoryDependencies;

  constructor(options: RepositoryMemoryOptions = {}) {
    this.dependencies = {
      persistence: options.persistence ?? new SqliteRepositoryPersistence(),
      inspect: options.inspect ?? inspectRepository,
      resolveIdentity: options.resolveIdentity ?? resolveRepositoryIdentity,
      getSourceRevision: options.getSourceRevision ?? getCurrentHeadRevision,
    };
  }

  async getSnapshot(repositoryPath: string): Promise<RepositorySnapshot> {
    const identity = this.dependencies.resolveIdentity(repositoryPath);
    const sourceRevision = await this.dependencies.getSourceRevision(identity.root);

    let persisted: RepositorySnapshot | undefined;
    try {
      persisted = this.dependencies.persistence.load(identity);
    } catch (error) {
      if (!(error instanceof InvalidRepositoryCacheError) &&
          !(error instanceof RepositoryPersistenceError)) {
        throw error;
      }
    }

    if (persisted && matchesCurrentRepository(persisted, identity, sourceRevision)) {
      return persisted;
    }

    return this.createFreshSnapshot(identity, sourceRevision);
  }

  async refresh(repositoryPath: string): Promise<RepositorySnapshot> {
    const identity = this.dependencies.resolveIdentity(repositoryPath);
    const sourceRevision = await this.dependencies.getSourceRevision(identity.root);

    return this.createFreshSnapshot(identity, sourceRevision);
  }

  private async createFreshSnapshot(
    identity: RepositoryIdentity,
    sourceRevision: string | undefined,
  ): Promise<RepositorySnapshot> {
    const snapshot: RepositorySnapshot = {
      identity,
      sourceRevision,
      capturedAt: new Date().toISOString(),
      serializationVersion: CURRENT_SERIALIZATION_VERSION,
      profile: this.dependencies.inspect(identity.root),
    };

    try {
      this.dependencies.persistence.save(snapshot);
    } catch (error) {
      if (!(error instanceof RepositoryPersistenceError)) {
        throw error;
      }
    }

    return snapshot;
  }
}

export function createRepositoryMemory(options: RepositoryMemoryOptions = {}): RepositoryMemory {
  return new RepositoryMemoryCoordinator(options);
}