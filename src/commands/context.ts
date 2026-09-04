import { buildRepositoryContext } from '../ai/profile-context';
import { inspectRepository } from '../inspect/profile';

export function contextCommand(rootPath?: string): void {
  const profile = inspectRepository(rootPath);
  console.log(buildRepositoryContext(profile));
}