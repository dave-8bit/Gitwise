import { inspectRepository } from '../inspect/profile';
import { formatDoctor } from '../inspect/formatter';

export function doctorCommand(rootPath?: string): void {
  const profile = inspectRepository(rootPath);
  console.log(formatDoctor(profile));
}
