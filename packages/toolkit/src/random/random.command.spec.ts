import { runCommand } from '../../test/run-command.js';

import { RandomCommand } from './random.command.js';
import { RandomModule } from './random.module.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EXPECTED_CHARACTER_COUNT = 90;
// Large enough that every character of the set is drawn with overwhelming probability:
// missing one has odds of (89/90)^40000, which is far below any realistic flake rate.
const CHARACTER_SAMPLE_LENGTH = 40_000;
// Over a range of two the upper bound comes up half the time, so never seeing it across
// this many draws has odds of 2^-25 — far below any realistic flake rate.
const INCLUSIVE_SAMPLE_COUNT = 25;

describe('RandomCommand', () => {
  let log: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  describe('uuid', () => {
    it('should generate a version 4 UUID', async () => {
      await runCommand(RandomModule, ['random', '-u']);

      expect(log).toHaveBeenCalledWith(expect.stringMatching(UUID_PATTERN));
    });
  });

  describe('string', () => {
    it('should generate a string of the requested length', async () => {
      await runCommand(RandomModule, ['random', '-s', '-l', '32']);

      expect(log).toHaveBeenCalledWith(expect.stringMatching(/^.{32}$/));
    });

    it('should draw from every character of the set', async () => {
      await runCommand(RandomModule, ['random', '--string', '--length', String(CHARACTER_SAMPLE_LENGTH)]);

      const [generated] = log.mock.calls.at(0) ?? [];

      expect(new Set(generated as string).size).toBe(EXPECTED_CHARACTER_COUNT);
    });

    it('should only use printable ASCII characters', async () => {
      await runCommand(RandomModule, ['random', '-s', '-l', String(CHARACTER_SAMPLE_LENGTH)]);

      const [generated] = log.mock.calls.at(0) ?? [];

      expect(generated as string).toMatch(/^[\x21-\x7e]+$/);
    });
  });

  describe('number', () => {
    it('should generate a number inside the requested range', async () => {
      await runCommand(RandomModule, ['random', '-n', '--min', '10', '--max', '11']);

      const [generated] = log.mock.calls.at(0) ?? [];

      expect(['10', '11']).toContain(generated);
    });

    it('should draw the value passed to --max', async () => {
      for (let draw = 0; draw < INCLUSIVE_SAMPLE_COUNT; draw++) {
        await runCommand(RandomModule, ['random', '-n', '--min', '10', '--max', '11']);
      }

      expect(log.mock.calls.flat()).toContain('11');
    });

    it('should return the only value a range of one allows', async () => {
      await runCommand(RandomModule, ['random', '-n', '--min', '10', '--max', '10']);

      expect(log).toHaveBeenCalledExactlyOnceWith('10');
    });

    it('should generate a number across the safe integer range without an explicit range', async () => {
      await runCommand(RandomModule, ['random', '--number']);

      const [generated] = log.mock.calls.at(0) ?? [];

      expect(generated).toBeTypeOf('string');
      expect(BigInt(generated as string)).toBeGreaterThanOrEqual(BigInt(Number.MIN_SAFE_INTEGER));
      expect(BigInt(generated as string)).toBeLessThanOrEqual(BigInt(Number.MAX_SAFE_INTEGER));
    });

    it('should accept a range beyond Number.MAX_SAFE_INTEGER', async () => {
      const minimum = 10n ** 30n;

      await runCommand(RandomModule, ['random', '-n', '--min', String(minimum), '--max', String(minimum + 2n)]);

      const [generated] = log.mock.calls.at(0) ?? [];

      expect([minimum, minimum + 1n, minimum + 2n]).toContain(BigInt(generated as string));
    });

    it('should not render the bigint suffix', async () => {
      await runCommand(RandomModule, ['random', '-n']);

      expect(log).toHaveBeenCalledWith(expect.stringMatching(/^-?\d+$/));
    });
  });

  describe('validation', () => {
    it('should reject combining uuid with string', async () => {
      await runCommand(RandomModule, ['random', '-u', '-s', '-l', '8']);

      expect(error).toHaveBeenCalledExactlyOnceWith('The --uuid and --string options cannot be used together.');
    });

    it('should reject combining uuid with number', async () => {
      await runCommand(RandomModule, ['random', '-u', '-n']);

      expect(error).toHaveBeenCalledExactlyOnceWith('The --uuid and --number options cannot be used together.');
    });

    it('should reject combining string with number', async () => {
      await runCommand(RandomModule, ['random', '-s', '-n']);

      expect(error).toHaveBeenCalledExactlyOnceWith('The --string and --number options cannot be used together.');
    });

    it('should reject string without a length', async () => {
      await runCommand(RandomModule, ['random', '-s']);

      expect(error).toHaveBeenCalledExactlyOnceWith('The --string option requires the --length option.');
    });

    it('should reject a range without number', async () => {
      await runCommand(RandomModule, ['random', '-u', '--min', '1']);

      expect(error).toHaveBeenCalledExactlyOnceWith('The --min and --max options can only be used with the --number option.');
    });

    it('should reject a maximum below the minimum', async () => {
      await runCommand(RandomModule, ['random', '-n', '--min', '11', '--max', '10']);

      expect(error).toHaveBeenCalledExactlyOnceWith('The --min option must not be greater than the --max option.');
    });

    it('should reject a minimum that is not an integer', async () => {
      await runCommand(RandomModule, ['random', '-n', '--min', '1.5']);

      expect(error).toHaveBeenCalledExactlyOnceWith('The --min option must be an integer.');
    });

    it('should reject a maximum that is not an integer', async () => {
      await runCommand(RandomModule, ['random', '-n', '--max', 'ten']);

      expect(error).toHaveBeenCalledExactlyOnceWith('The --max option must be an integer.');
    });

    it('should keep a rejection off stdout so that a pipe carries no output', async () => {
      await runCommand(RandomModule, ['random', '-u', '-n']);

      expect(log).not.toHaveBeenCalled();
    });

    it('should exit non-zero on a rejection', async () => {
      await runCommand(RandomModule, ['random', '-u', '-n']);

      expect(process.exitCode).toBe(1);
    });

    it('should print nothing when options are missing', async () => {
      await new RandomCommand().run([], undefined);

      expect(log).not.toHaveBeenCalled();
    });
  });
});
