import { CommandTestFactory } from 'nest-commander-testing';

import type { Type } from '@nestjs/common';

/**
 * Runs a command through the real commander pipeline so that option parsers
 * declared with `@Option` are exercised the same way the CLI exercises them.
 */
export const runCommand = async (module: Type<unknown>, args: string[]): Promise<void> => {
  const app = await CommandTestFactory.createTestingCommand({ imports: [module] }).compile();

  await CommandTestFactory.run(app, args);
};
