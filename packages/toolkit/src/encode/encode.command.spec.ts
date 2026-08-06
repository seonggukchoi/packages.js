import { runCommand } from '../../test/run-command.js';

import { EncodeCommand } from './encode.command.js';
import { EncodeModule } from './encode.module.js';

describe('EncodeCommand', () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  describe('encoding', () => {
    it('should encode the input as base64', async () => {
      await runCommand(EncodeModule, ['encode', '-b', 'This is very easy!']);

      expect(log).toHaveBeenCalledWith('VGhpcyBpcyB2ZXJ5IGVhc3kh');
    });

    it('should percent-encode the input as an URL component', async () => {
      await runCommand(EncodeModule, ['encode', '-u', 'a b&c=d']);

      expect(log).toHaveBeenCalledWith('a%20b%26c%3Dd');
    });

    it('should encode the input as hex', async () => {
      await runCommand(EncodeModule, ['encode', '-x', 'hello']);

      expect(log).toHaveBeenCalledWith('68656c6c6f');
    });

    it.each([['-b'], ['-u'], ['-x']])('should encode an empty string when no input is passed to %s', async (flag) => {
      await runCommand(EncodeModule, ['encode', flag]);

      expect(log).toHaveBeenCalledWith('');
    });
  });

  describe('decoding', () => {
    it('should decode a base64 input', async () => {
      await runCommand(EncodeModule, ['encode', '-b', '-d', 'VGhpcyBpcyB2ZXJ5IGVhc3kh']);

      expect(log).toHaveBeenCalledWith('This is very easy!');
    });

    it('should decode a percent-encoded URL component', async () => {
      await runCommand(EncodeModule, ['encode', '-u', '-d', 'a%20b%26c%3Dd']);

      expect(log).toHaveBeenCalledWith('a b&c=d');
    });

    it('should decode a hex input', async () => {
      await runCommand(EncodeModule, ['encode', '-x', '--decode', '68656c6c6f']);

      expect(log).toHaveBeenCalledWith('hello');
    });

    it.each([['-b'], ['-u'], ['-x']])('should decode an empty string when no input is passed to %s', async (flag) => {
      await runCommand(EncodeModule, ['encode', flag, '-d']);

      expect(log).toHaveBeenCalledWith('');
    });
  });

  describe('validation', () => {
    it('should reject using base64, URL and hex together', async () => {
      await runCommand(EncodeModule, ['encode', '-b', '-u', '-x', 'hello']);

      expect(log).toHaveBeenCalledExactlyOnceWith('The options cannot be used together.');
    });

    it('should print nothing when options are missing', async () => {
      await new EncodeCommand().run(['hello'], undefined);

      expect(log).not.toHaveBeenCalled();
    });
  });
});
