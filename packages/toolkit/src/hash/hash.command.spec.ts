import { runCommand } from '../../test/run-command.js';

import { HashCommand } from './hash.command.js';
import { HashModule } from './hash.module.js';

describe('HashCommand', () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('should hash the input as MD5', async () => {
    await runCommand(HashModule, ['hash', '-m', 'test']);

    expect(log).toHaveBeenCalledWith('098f6bcd4621d373cade4e832627b4f6');
  });

  it('should hash the input as SHA-256', async () => {
    await runCommand(HashModule, ['hash', '-s', 'test']);

    expect(log).toHaveBeenCalledWith('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });

  it.each([
    ['--md5', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['--sha256', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ])('should hash an empty string when no input is passed to %s', async (flag, expected) => {
    await runCommand(HashModule, ['hash', flag]);

    expect(log).toHaveBeenCalledWith(expected);
  });

  it('should reject using MD5 and SHA-256 together', async () => {
    await runCommand(HashModule, ['hash', '--md5', '--sha256', 'test']);

    expect(log).toHaveBeenCalledExactlyOnceWith('The options cannot be used together.');
  });

  it('should print nothing when options are missing', async () => {
    await new HashCommand().run(['test'], undefined);

    expect(log).not.toHaveBeenCalled();
  });
});
