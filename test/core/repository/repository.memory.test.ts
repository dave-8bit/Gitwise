import { describe, expect, it } from 'vitest';

import {
  InvalidRepositoryCacheError,
  RepositoryPersistenceError,
  type RepositoryPersistence,
} from '../../../src/core/repository/repository.persistence';
import { resolveRepositoryIdentity, type RepositoryIdentity } from '../../../src/core/repository/repository.identity';
import {
  CURRENT_SERIALIZATION_VERSION,
  type RepositorySnapshot,
} from '../../../src/core/repository/repository.snapshot';
import {
  RepositoryMemoryCoordinator,
  type RepositoryMemoryOptions,
} from '../../../src/core/repository/repository.memory';
import type { RepositoryProfile } from '../../../src/inspect/profile';

function makeIdentity(root = '/repo'): RepositoryIdentity {
  return { root, key: root };
}

function makeProfile(root = '/repo'): RepositoryProfile {
  return { root } as RepositoryProfile;
}

function makeSnapshot(overrides: Partial<RepositorySnapshot> = {}): RepositorySnapshot {
  return {
    identity: makeIdentity(),
    sourceRevision: 'head-a',
    capturedAt: '2026-09-04T00:00:00.000Z',
    serializationVersion: CURRENT_SERIALIZATION_VERSION,
    profile: makeProfile(),
    ...overrides,
  };
}

class FakePersistence implements RepositoryPersistence {
  loaded: RepositorySnapshot | undefined;
  saved: RepositorySnapshot[] = [];
  loadCalls: RepositoryIdentity[] = [];
  loadError: Error | undefined;
  saveError: Error | undefined;

  load(identity: RepositoryIdentity): RepositorySnapshot | undefined {
    this.loadCalls.push(identity);
    if (this.loadError) throw this.loadError;
    return this.loaded;
  }

  save(snapshot: RepositorySnapshot): void {
    if (this.saveError) throw this.saveError;
    this.saved.push(snapshot);
    this.loaded = snapshot;
  }

  clear(): void {}
}

function setup(overrides: Partial<RepositoryMemoryOptions> = {}) {
  const persistence = new FakePersistence();
  const profile = makeProfile();
  let inspections = 0;
  const options: RepositoryMemoryOptions = {
    persistence,
    resolveIdentity: () => makeIdentity(),
    getSourceRevision: async () => 'head-a',
    inspect: () => {
      inspections += 1;
      return profile;
    },
    ...overrides,
  };

  return {
    memory: new RepositoryMemoryCoordinator(options),
    persistence,
    profile,
    get inspections() {
      return inspections;
    },
  };
}

describe('RepositoryMemoryCoordinator', () => {
  it('inspects and saves a fresh snapshot on a successful cache miss', async () => {
    const setupState = setup();

    const result = await setupState.memory.getSnapshot('/input');

    expect(setupState.persistence.loadCalls).toEqual([makeIdentity()]);
    expect(setupState.inspections).toBe(1);
    expect(setupState.persistence.saved).toHaveLength(1);
    expect(setupState.persistence.saved[0]).toBe(result);
    expect(result).toMatchObject({
      identity: makeIdentity(),
      sourceRevision: 'head-a',
      serializationVersion: CURRENT_SERIALIZATION_VERSION,
      profile: setupState.profile,
    });
  });

  it('returns a valid current cache without inspecting', async () => {
    const setupState = setup();
    const snapshot = makeSnapshot();
    setupState.persistence.loaded = snapshot;

    await expect(setupState.memory.getSnapshot('/input')).resolves.toBe(snapshot);
    expect(setupState.inspections).toBe(0);
    expect(setupState.persistence.saved).toHaveLength(0);
  });

  it('reuses a snapshot when identity, root, revision, and version match', async () => {
    const setupState = setup();
    const snapshot = makeSnapshot();
    setupState.persistence.loaded = snapshot;

    const result = await setupState.memory.getSnapshot('/nested/path');

    expect(result).toBe(snapshot);
    expect(setupState.inspections).toBe(0);
  });

  it.each([
    ['source revision', { sourceRevision: 'head-old' }],
    ['identity', { identity: makeIdentity('/other-repo') }],
    ['canonical root', { identity: { root: '/repo-alias', key: '/repo' } }],
    ['serialization version', { serializationVersion: CURRENT_SERIALIZATION_VERSION + 1 }],
  ])('refreshes a stale cache when %s does not match', async (_reason, changes) => {
    const setupState = setup({
      resolveIdentity: () => makeIdentity('/repo'),
    });
    setupState.persistence.loaded = makeSnapshot(changes);

    const result = await setupState.memory.getSnapshot('/input');

    expect(setupState.inspections).toBe(1);
    expect(result).toBe(setupState.persistence.saved[0]);
    expect(result.identity).toEqual(makeIdentity('/repo'));
    expect(result.sourceRevision).toBe('head-a');
  });

  it('rebuilds after an invalid persisted cache', async () => {
    const setupState = setup();
    const invalidSnapshot = makeSnapshot({ sourceRevision: 'head-old' });
    setupState.persistence.loaded = invalidSnapshot;
    setupState.persistence.loadError = new InvalidRepositoryCacheError('corrupt cache');

    const result = await setupState.memory.getSnapshot('/repo');

    expect(setupState.persistence.loadCalls).toEqual([makeIdentity()]);
    expect(setupState.inspections).toBe(1);
    expect(setupState.persistence.saved).toHaveLength(1);
    expect(setupState.persistence.saved[0]).toBe(result);
    expect(setupState.persistence.saved[0]).not.toBe(invalidSnapshot);
    expect(result.profile).toBe(setupState.profile);
    expect(result.sourceRevision).toBe('head-a');
  });

  it('replaces an invalid persisted snapshot with the freshly inspected snapshot', async () => {
    const setupState = setup();
    const invalidSnapshot = makeSnapshot({ sourceRevision: 'head-invalid' });
    setupState.persistence.loaded = invalidSnapshot;
    setupState.persistence.loadError = new InvalidRepositoryCacheError('corrupt cache');

    const result = await setupState.memory.getSnapshot('/input');

    expect(setupState.inspections).toBe(1);
    expect(setupState.persistence.saved).toHaveLength(1);
    expect(setupState.persistence.saved[0]).toEqual(result);
    expect(setupState.persistence.saved[0]).not.toEqual(invalidSnapshot);
    expect(result.profile).toBe(setupState.profile);
    expect(result.sourceRevision).toBe('head-a');
  });

  it('falls back to inspection when persistence load fails', async () => {
    const setupState = setup();
    setupState.persistence.loadError = new RepositoryPersistenceError('database unavailable');

    const result = await setupState.memory.getSnapshot('/repo');

    expect(setupState.inspections).toBe(1);
    expect(result.profile).toBe(setupState.profile);
    expect(setupState.persistence.saved).toHaveLength(1);
  });

  it('returns the fresh snapshot when persistence save fails', async () => {
    const setupState = setup();
    setupState.persistence.saveError = new RepositoryPersistenceError('database unavailable');

    const result = await setupState.memory.getSnapshot('/repo');

    expect(result.profile).toBe(setupState.profile);
    expect(result.identity).toEqual(makeIdentity());
    expect(setupState.inspections).toBe(1);
  });

  it('refresh always inspects and creates a complete snapshot', async () => {
    const setupState = setup({
      getSourceRevision: async () => undefined,
    });
    setupState.persistence.loaded = makeSnapshot({ sourceRevision: undefined });

    const result = await setupState.memory.refresh('/repo');

    expect(setupState.inspections).toBe(1);
    expect(result).toMatchObject({
      identity: makeIdentity(),
      sourceRevision: undefined,
      serializationVersion: CURRENT_SERIALIZATION_VERSION,
      profile: setupState.profile,
    });
    expect(Date.parse(result.capturedAt)).not.toBeNaN();
    expect(setupState.persistence.saved).toEqual([result]);
  });

  it('does not fabricate a snapshot when persistence reports an unknown error', async () => {
    const setupState = setup();
    setupState.persistence.loadError = new Error('unexpected failure');

    await expect(setupState.memory.getSnapshot('/repo')).rejects.toThrow('unexpected failure');
    expect(setupState.inspections).toBe(0);
  });
});