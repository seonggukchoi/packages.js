import { randomInt, randomUUID } from 'node:crypto';

import { Command, Option } from 'nest-commander';

import { CopyableCommandRunner } from '../copyable/index.js';

import { RandomCommandOptions } from './random-command-options.interface.js';

const PASSWORD_CHARACTERS = ''
  .concat('abcdefghijklmnopqrstuvwxyz')
  .concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
  .concat('0123456789')
  .concat('~!@#$%^&*()_+-=|[]{};:,./<>?')
  .split('');

// `randomInt` draws from a cryptographically secure source but rejects spans wider
// than 2^48, so the default range is capped there instead of the safe-integer range.
const MAXIMUM_RANGE_SPAN = 2 ** 48 - 1;
const DEFAULT_MINIMUM = 0;
const DEFAULT_MAXIMUM = MAXIMUM_RANGE_SPAN;

@Command({ name: 'random', description: 'Generate a random string.' })
export class RandomCommand extends CopyableCommandRunner<RandomCommandOptions> {
  public override async run(passedParams: string[], options?: RandomCommandOptions | undefined): Promise<void> {
    if (!this.validateOptions(options)) {
      return;
    }

    if (options!.uuid) {
      await this.print(randomUUID(), options!.copy);
    }

    if (options!.string && options!.length) {
      await this.print(this.generateString(options!.length), options!.copy);
    }

    if (options!.number) {
      await this.print(randomInt(options!.min ?? DEFAULT_MINIMUM, options!.max ?? DEFAULT_MAXIMUM), options!.copy);
    }
  }

  @Option({ flags: '-u, --uuid', description: 'Generate an UUID.' })
  private applyUuidOption(): true {
    return true;
  }

  @Option({ flags: '-s, --string', description: 'Generate a random string.' })
  private applyStringOption(): boolean {
    return true;
  }

  @Option({ flags: '-l, --length <length>', description: 'Set a length of random string.' })
  private applyLengthOption(length: string): number {
    return Number(length);
  }

  @Option({ flags: '-n, --number', description: 'Generate a random number.' })
  private applyNumberOption(): boolean {
    return true;
  }

  @Option({ flags: '--min <value>', description: 'Set a mininum value of range.' })
  private applyMinOption(value: string): number {
    return Number(value);
  }

  @Option({ flags: '--max <value>', description: 'Set a maximum value of range.' })
  private applyMaxOption(value: string): number {
    return Number(value);
  }

  private validateOptions(options?: RandomCommandOptions | undefined): boolean {
    if (!options) {
      return false;
    }

    if (options.uuid && options.string) {
      this.print('The --uuid and --string options cannot be used together.');

      return false;
    }

    if (options.uuid && options.number) {
      this.print('The --uuid and --number options cannot be used together.');

      return false;
    }

    if (options.string && options.number) {
      this.print('The --string and --number options cannot be used together.');

      return false;
    }

    if (options.string && !options.length) {
      this.print('The --string option requires the --length option.');

      return false;
    }

    if (!options.number && (typeof options.min === 'number' || typeof options.max === 'number')) {
      this.print('The --min and --max options can only be used with the --number option.');

      return false;
    }

    if (options.number && !this.validateRange(options.min ?? DEFAULT_MINIMUM, options.max ?? DEFAULT_MAXIMUM)) {
      return false;
    }

    return true;
  }

  private validateRange(minimum: number, maximum: number): boolean {
    if (minimum >= maximum) {
      this.print('The --min option must be smaller than the --max option.');

      return false;
    }

    if (maximum - minimum > MAXIMUM_RANGE_SPAN) {
      this.print(`The range between --min and --max must not exceed ${MAXIMUM_RANGE_SPAN}.`);

      return false;
    }

    return true;
  }

  private generateString(length: number): string {
    return Array.from({ length })
      .map(() => PASSWORD_CHARACTERS[randomInt(0, PASSWORD_CHARACTERS.length)])
      .join('');
  }
}
