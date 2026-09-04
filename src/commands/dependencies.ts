import { inspectRepository } from '../inspect/profile';
import { formatDependencies } from '../inspect/formatter';

export function dependenciesCommand(rootPath?: string): void {
  const profile = inspectRepository(rootPath);
  console.log(formatDependencies(profile.dependencies, profile.packageManager));
}