import { runCommand } from '../../test/run-command.js';

import { OtpCommand } from './otp.command.js';
import { OtpModule } from './otp.module.js';

// A 20-byte (160-bit) secret, the length RFC 4226 recommends.
const RECOMMENDED_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
// A 10-byte (80-bit) secret, the length authenticator apps commonly issue. otplib
// rejects it under its default guardrails, so this pins the relaxed configuration.
const SHORT_SECRET = 'JBSWY3DPEHPK3PXP';

describe('OtpCommand', () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should generate the code for a 160-bit secret', async () => {
    await runCommand(OtpModule, ['otp', '-s', RECOMMENDED_SECRET]);

    expect(log).toHaveBeenCalledWith('921300');
  });

  it('should generate the code for an 80-bit secret', async () => {
    await runCommand(OtpModule, ['otp', '--secret', SHORT_SECRET]);

    expect(log).toHaveBeenCalledWith('324550');
  });

  it('should print nothing when options are missing', async () => {
    await new OtpCommand().run([], undefined);

    expect(log).not.toHaveBeenCalled();
  });
});
