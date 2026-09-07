import type { RepositoryIdentity } from './repository.identity';
import type { RepositorySnapshot } from './repository.snapshot';

export interface RepositoryPersistence {
  load(identity: RepositoryIdentity): RepositorySnapshot | undefined;
  save(snapshot: RepositorySnapshot): void;
  clear(identity: RepositoryIdentity): void;
}

export class RepositoryPersistenceError extends Error {
  readonly kind = 'persistence-failure';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, RepositoryPersistenceError.prototype);
  }
}

export class InvalidRepositoryCacheError extends Error {
  readonly kind = 'invalid-cache';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidRepositoryCacheError.prototype);
  }
}
