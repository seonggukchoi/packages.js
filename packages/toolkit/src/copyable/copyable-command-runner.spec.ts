import { runCommand } from '../../test/run-command.js';
import { JwtModule } from '../jwt/jwt.module.js';
import { RandomModule } from '../random/random.module.js';

const { writeSync } = vi.hoisted(() => ({ writeSync: vi.fn() }));

vi.mock('clipboardy', () => ({ default: { writeSync } }));

describe('CopyableCommandRunner', () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('should not touch the clipboard without the copy option', async () => {
    await runCommand(RandomModule, ['random', '-u']);

    expect(writeSync).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('should copy a generated string verbatim', async () => {
    await runCommand(RandomModule, ['random', '-u', '-c']);

    const [generated] = log.mock.calls.at(0) ?? [];

    expect(writeSync).toHaveBeenCalledExactlyOnceWith(generated);
    expect(log).toHaveBeenCalledWith('\nCopied to clipboard!');
  });

  it('should copy a generated number without the bigint suffix', async () => {
    // A range of one so that the copied value is fixed rather than drawn.
    await runCommand(RandomModule, ['random', '--number', '--min', '10', '--max', '10', '--copy']);

    expect(log).toHaveBeenCalledWith('10');
    expect(writeSync).toHaveBeenCalledExactlyOnceWith('10');
  });

  it('should serialise a decoded payload as JSON before copying it', async () => {
    await runCommand(JwtModule, ['jwt', '-d', 'not-a-token', '-c']);

    expect(writeSync).toHaveBeenCalledExactlyOnceWith('null');
  });
});
