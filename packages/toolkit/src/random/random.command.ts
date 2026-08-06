import { randomInt, randomUUID } from 'node:crypto';

import { Command, Option } from 'nest-commander';

import { CommandFailureError } from '../command-failure/index.js';
import { CopyableCommandRunner } from '../copyable/index.js';

import { RandomCommandOptions } from './random-command-options.interface.js';
import { randomBigInt } from './random-integer.js';

const PASSWORD_CHARACTERS = ''
  .concat('abcdefghijklmnopqrstuvwxyz')
  .concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
  .concat('0123456789')
  .concat('~!@#$%^&*()_+-=|[]{};:,./<>?')
  .split('');

// Matches what `BigInt` accepts as a decimal integer, so a value that passes here
// cannot make the conversion throw.
const INTEGER_PATTERN = /^-?\d+$/;

const DEFAULT_MINIMUM = BigInt(Number.MIN_SAFE_INTEGER);
const DEFAULT_MAXIMUM = BigInt(Number.MAX_SAFE_INTEGER);

@Command({ name: 'random', description: 'Generate a random string.' })
export class RandomCommand extends CopyableCommandRunner<RandomCommandOptions> {
  public override async run(passedParams: string[], options?: RandomCommandOptions | undefined): Promise<void> {
    if (!options) {
      return;
    }

    this.assertValidOptions(options);

    if (options.uuid) {
      await this.print(randomUUID(), options.copy);
    }

    if (options.string && options.length) {
      await this.print(this.generateString(options.length), options.copy);
    }

    if (options.number) {
      const minimum = options.min === undefined ? DEFAULT_MINIMUM : BigInt(options.min);
      const maximum = options.max === undefined ? DEFAULT_MAXIMUM : BigInt(options.max);

      // Printed as a string because `console.log` renders a bigint with an `n` suffix.
      await this.print(randomBigInt(minimum, maximum).toString(), options.copy);
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
  private applyMinOption(value: string): string {
    return value;
  }

  @Option({ flags: '--max <value>', description: 'Set a maximum value of range.' })
  private applyMaxOption(value: string): string {
    return value;
  }

  private assertValidOptions(options: RandomCommandOptions): void {
    if (options.uuid && options.string) {
      throw new CommandFailureError('The --uuid and --string options cannot be used together.');
    }

    if (options.uuid && options.number) {
      throw new CommandFailureError('The --uuid and --number options cannot be used together.');
    }

    if (options.string && options.number) {
      throw new CommandFailureError('The --string and --number options cannot be used together.');
    }

    if (options.string && !options.length) {
      throw new CommandFailureError('The --string option requires the --length option.');
    }

    if (!options.number && (options.min !== undefined || options.max !== undefined)) {
      throw new CommandFailureError('The --min and --max options can only be used with the --number option.');
    }

    if (options.number) {
      this.assertValidRange(options.min, options.max);
    }
  }

  private assertValidRange(min?: string, max?: string): void {
    if (min !== undefined && !INTEGER_PATTERN.test(min)) {
      throw new CommandFailureError('The --min option must be an integer.');
    }

    if (max !== undefined && !INTEGER_PATTERN.test(max)) {
      throw new CommandFailureError('The --max option must be an integer.');
    }

    const minimum = min === undefined ? DEFAULT_MINIMUM : BigInt(min);
    const maximum = max === undefined ? DEFAULT_MAXIMUM : BigInt(max);

    if (minimum >= maximum) {
      throw new CommandFailureError('The --min option must be smaller than the --max option.');
    }
  }

  private generateString(length: number): string {
    return Array.from({ length })
      .map(() => PASSWORD_CHARACTERS[randomInt(0, PASSWORD_CHARACTERS.length)])
      .join('');
  }
}
