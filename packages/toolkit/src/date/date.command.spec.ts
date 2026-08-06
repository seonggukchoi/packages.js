import { runCommand } from '../../test/run-command.js';

import { DateCommand } from './date.command.js';
import { DateModule } from './date.module.js';

describe('DateCommand', () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('should format the passed date with the given format', async () => {
    await runCommand(DateModule, ['date', '-f', 'YYYY-MM-DD', '2024-01-02']);

    expect(log).toHaveBeenCalledWith('2024-01-02');
  });

  it('should apply the format on every token of the given pattern', async () => {
    await runCommand(DateModule, ['date', '--format', 'YYYY/MM/DD HH:mm', '2024-01-02T03:04:00']);

    expect(log).toHaveBeenCalledWith('2024/01/02 03:04');
  });

  it('should print nothing when options are missing', async () => {
    await new DateCommand().run(['2024-01-02'], undefined);

    expect(log).not.toHaveBeenCalled();
  });
});
