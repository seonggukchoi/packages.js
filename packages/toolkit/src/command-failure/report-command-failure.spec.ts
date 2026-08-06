import { CommandFailureError } from './command-failure.error.js';
import { reportCommandFailure } from './report-command-failure.js';

describe('reportCommandFailure', () => {
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('should print an expected failure as its message alone', () => {
    reportCommandFailure(new CommandFailureError('The --secret option is required.'));

    expect(error).toHaveBeenCalledExactlyOnceWith('The --secret option is required.');
  });

  it('should print an unexpected failure whole so that the stack survives', () => {
    const unexpected = new TypeError('Cannot read properties of undefined');

    reportCommandFailure(unexpected);

    expect(error).toHaveBeenCalledExactlyOnceWith(unexpected);
  });

  it('should mark the process as failed', () => {
    reportCommandFailure(new CommandFailureError('The --secret option is required.'));

    expect(process.exitCode).toBe(1);
  });

  it('should keep the original error reachable as the cause', () => {
    const cause = new Error('Invalid Base32 string');

    const failure = new CommandFailureError('The --secret option must be a Base32 secret.', { cause });

    expect(failure.cause).toBe(cause);
    expect(failure.name).toBe('CommandFailureError');
  });
});
