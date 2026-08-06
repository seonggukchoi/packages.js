import { randomInt, randomUUID } from 'node:crypto';

import { Command, Option } from 'nest-commander';

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
      const minimum = options!.min === undefined ? DEFAULT_MINIMUM : BigInt(options!.min);
      const maximum = options!.max === undefined ? DEFAULT_MAXIMUM : BigInt(options!.max);

      // Printed as a string because `console.log` renders a bigint with an `n` suffix.
      await this.print(randomBigInt(minimum, maximum).toString(), options!.copy);
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

    if (!options.number && (options.min !== undefined || options.max !== undefined)) {
      this.print('The --min and --max options can only be used with the --number option.');

      return false;
    }

    if (options.number && !this.validateRange(options.min, options.max)) {
      return false;
    }

    return true;
  }

  private validateRange(min?: string, max?: string): boolean {
    if (min !== undefined && !INTEGER_PATTERN.test(min)) {
      this.print('The --min option must be an integer.');

      return false;
    }

    if (max !== undefined && !INTEGER_PATTERN.test(max)) {
      this.print('The --max option must be an integer.');

      return false;
    }

    const minimum = min === undefined ? DEFAULT_MINIMUM : BigInt(min);
    const maximum = max === undefined ? DEFAULT_MAXIMUM : BigInt(max);

    if (minimum >= maximum) {
      this.print('The --min option must be smaller than the --max option.');

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
