import { inspectRepository } from '../inspect/profile';
import { formatArchitecture } from '../inspect/formatter';

export function architectureCommand(rootPath?: string): void {
  const profile = inspectRepository(rootPath);
  console.log(formatArchitecture(profile.architecture));
}