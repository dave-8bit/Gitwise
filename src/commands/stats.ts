import { inspectRepository } from '../inspect/profile';
import { formatRepositoryStats } from '../inspect/formatter';

export function statsCommand(rootPath?: string): void {
  const profile = inspectRepository(rootPath);
  console.log(formatRepositoryStats(profile));
}