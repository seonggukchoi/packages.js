import { createHash } from 'node:crypto';

import { Command, Option } from 'nest-commander';

import { CommandFailureError } from '../command-failure/index.js';
import { CopyableCommandRunner } from '../copyable/index.js';

import { HashCommandOptions } from './hash-command-options.interface.js';

@Command({ name: 'hash', description: 'Hash the input.' })
export class HashCommand extends CopyableCommandRunner<HashCommandOptions> {
  public override async run(passedParams: string[], options?: HashCommandOptions | undefined): Promise<void> {
    if (!options) {
      return;
    }

    if (options.md5 && options.sha256) {
      throw new CommandFailureError('The --md5 and --sha256 options cannot be used together.');
    }

    if (options.md5) {
      await this.print(
        createHash('md5')
          .update(passedParams.at(0) ?? '')
          .digest('hex'),
        options.copy,
      );
    }

    if (options.sha256) {
      await this.print(
        createHash('sha256')
          .update(passedParams.at(0) ?? '')
          .digest('hex'),
        options.copy,
      );
    }
  }

  @Option({ flags: '-m, --md5', description: 'Hash the input as MD5.' })
  private applyMd5Option(): boolean {
    return true;
  }

  @Option({ flags: '-s, --sha256', description: 'Hash the input as SHA-256.' })
  private hashSha256(): boolean {
    return true;
  }
}
