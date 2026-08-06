import { CommandRunner, Option } from 'nest-commander';

import { CopyableCommandOptions } from './copyable-command-options.interface.js';

export abstract class CopyableCommandRunner<CommandOptions extends CopyableCommandOptions = CopyableCommandOptions> extends CommandRunner {
  @Option({ flags: '-c, --copy', description: 'Copy the generated value to clipboard.', defaultValue: false })
  protected async parseCopyToClipboard() {
    return true;
  }

  protected async print(value: unknown, copyToClipboard: boolean = false): Promise<void> {
    console.log(value);

    if (copyToClipboard) {
      const clipboardy = await import('clipboardy');

      clipboardy.default.writeSync(typeof value === 'string' ? value : JSON.stringify(value));

      console.log('\nCopied to clipboard!');
    }
  }

  public abstract override run(passedParams: string[], options?: CommandOptions | undefined): Promise<void>;
}
