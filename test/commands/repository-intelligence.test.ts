import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeRepositoryProfile } from '../helpers/repository-profile';

vi.mock('../../src/inspect/profile', () => ({
  inspectRepository: vi.fn(),
}));

import { inspectRepository } from '../../src/inspect/profile';
import { contextCommand } from '../../src/commands/context';
import { architectureCommand } from '../../src/commands/architecture';
import { dependenciesCommand } from '../../src/commands/dependencies';
import { statsCommand } from '../../src/commands/stats';

const inspectRepositoryMock = vi.mocked(inspectRepository);

describe('repository intelligence commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inspectRepositoryMock.mockReturnValue(makeRepositoryProfile());
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('context uses the live profile, respects an explicit rootPath, and prints context', () => {
    contextCommand('C:/repo');

    expect(inspectRepositoryMock).toHaveBeenCalledWith('C:/repo');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Languages: TypeScript, JavaScript'));
  });

  it('context uses the default path when no rootPath is supplied', () => {
    contextCommand();

    expect(inspectRepositoryMock).toHaveBeenCalledWith(undefined);
    expect(console.log).toHaveBeenCalled();
  });

  it('context surfaces inspection failures', () => {
    inspectRepositoryMock.mockImplementation(() => {
      throw new Error('inspection failed');
    });

    expect(() => contextCommand()).toThrow('inspection failed');
  });

  it('architecture prints the profile architecture and respects rootPath', () => {
    architectureCommand('C:/repo');

    expect(inspectRepositoryMock).toHaveBeenCalledWith('C:/repo');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Monorepo: Yes'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Confidence: 0.88'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('package.json workspaces field'));
  });

  it('dependencies prints grouped dependency data and respects rootPath', () => {
    dependenciesCommand('C:/repo');

    expect(inspectRepositoryMock).toHaveBeenCalledWith('C:/repo');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Runtime Count: 2'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Development Count: 2'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Package Manager: npm'));
  });

  it('stats prints profile-backed statistics and respects rootPath', () => {
    statsCommand('C:/repo');

    expect(inspectRepositoryMock).toHaveBeenCalledWith('C:/repo');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Files: 12'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Total Dependencies: 4'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Build Tool: tsup'));
  });
});