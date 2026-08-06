import jwt from 'jsonwebtoken';

import { runCommand } from '../../test/run-command.js';

import { JwtCommand } from './jwt.command.js';
import { JwtModule } from './jwt.module.js';

const SECRET = 'a-test-secret';

describe('JwtCommand', () => {
  let log: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('should sign the payload with the given secret', async () => {
    await runCommand(JwtModule, ['jwt', '-s', SECRET, 'a-payload']);

    const [token] = log.mock.calls.at(0) ?? [];

    expect(jwt.verify(token as string, SECRET)).toBe('a-payload');
  });

  it('should decode a token without requiring a secret', async () => {
    const token = jwt.sign({ name: 'toolkit' }, SECRET);

    await runCommand(JwtModule, ['jwt', '--decode', token]);

    expect(log).toHaveBeenCalledWith(expect.objectContaining({ name: 'toolkit' }));
  });

  it('should decode to null when the token is not a JWT', async () => {
    await runCommand(JwtModule, ['jwt', '-d', 'not-a-token']);

    expect(log).toHaveBeenCalledWith(null);
  });

  it('should sign an empty payload when no payload is passed', async () => {
    await runCommand(JwtModule, ['jwt', '-s', SECRET]);

    expect(log).toHaveBeenCalledWith(jwt.sign('', SECRET));
  });

  it('should decode to null when no token is passed', async () => {
    await runCommand(JwtModule, ['jwt', '-d']);

    expect(log).toHaveBeenCalledWith(null);
  });

  it('should reject signing without a secret', async () => {
    await runCommand(JwtModule, ['jwt', 'a-payload']);

    expect(error).toHaveBeenCalledExactlyOnceWith('The --secret option is required when signing a token.');
    expect(log).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('should print nothing when options are missing', async () => {
    await new JwtCommand().run(['a-payload'], undefined);

    expect(log).not.toHaveBeenCalled();
  });
});
