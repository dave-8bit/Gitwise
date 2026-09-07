import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/inspect/inventory', () => ({
  buildFileInventory: vi.fn(),
}));
vi.mock('../../src/inspect/tree', () => ({
  buildRepositoryTree: vi.fn(),
}));
vi.mock('../../src/inspect/formatter', () => ({
  formatRepositoryTree: vi.fn(),
}));
vi.mock('../../src/inspect/profile', () => ({
  inspectRepository: vi.fn(),
}));

import { buildFileInventory } from '../../src/inspect/inventory';
import { buildRepositoryTree } from '../../src/inspect/tree';
import { formatRepositoryTree } from '../../src/inspect/formatter';
import { inspectRepository } from '../../src/inspect/profile';
import { treeCommand } from '../../src/commands/tree';

const inventoryMock = vi.mocked(buildFileInventory);
const treeMock = vi.mocked(buildRepositoryTree);
const formatMock = vi.mocked(formatRepositoryTree);
const inspectMock = vi.mocked(inspectRepository);

describe('tree command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inventoryMock.mockReturnValue({ root: 'C:/repo', files: [{ path: 'src/index.ts' }] });
    treeMock.mockReturnValue({ children: [] });
    formatMock.mockReturnValue('tree output');
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('forwards an explicit root, builds from inventory, and prints formatted output', () => {
    treeCommand('C:/repo');

    expect(inventoryMock).toHaveBeenCalledWith({ rootPath: 'C:/repo' });
    expect(treeMock).toHaveBeenCalledWith([{ path: 'src/index.ts' }]);
    expect(formatMock).toHaveBeenCalledWith('C:/repo', { children: [] }, 3);
    expect(console.log).toHaveBeenCalledWith('tree output');
    expect(inspectMock).not.toHaveBeenCalled();
  });

  it('forwards an omitted root as undefined', () => {
    treeCommand();

    expect(inventoryMock).toHaveBeenCalledWith({ rootPath: undefined });
  });

  it('propagates inventory, projection, and formatter failures', () => {
    inventoryMock.mockImplementation(() => {
      throw new Error('inventory failed');
    });
    expect(() => treeCommand()).toThrow('inventory failed');

    inventoryMock.mockReturnValue({ root: 'C:/repo', files: [{ path: 'src/index.ts' }] });
    treeMock.mockImplementation(() => {
      throw new Error('projection failed');
    });
    expect(() => treeCommand()).toThrow('projection failed');
  });
});
