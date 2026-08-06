import { runCommand } from '../../test/run-command.js';

import { OtpCommand } from './otp.command.js';
import { OtpModule } from './otp.module.js';

// A 20-byte (160-bit) secret, the length RFC 4226 recommends.
const RECOMMENDED_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
// A 10-byte (80-bit) secret, the length authenticator apps commonly issue. otplib
// rejects it under its default guardrails, so this pins the relaxed configuration.
const SHORT_SECRET = 'JBSWY3DPEHPK3PXP';
// A 5-byte (40-bit) secret, below the floor the relaxed guardrails still enforce.
const TOO_SHORT_SECRET = 'JBSWY3DP';
const NOT_BASE32_SECRET = '!!!!!!!!!!!!!!!!';

const SECRET_REQUIREMENT = 'The --secret option must be a Base32 secret of at least 10 bytes (80 bits).';

describe('OtpCommand', () => {
  let log: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

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

  describe('failure', () => {
    it('should reject a secret below the guardrail without naming an otplib error', async () => {
      await runCommand(OtpModule, ['otp', '-s', TOO_SHORT_SECRET]);

      expect(error).toHaveBeenCalledExactlyOnceWith(SECRET_REQUIREMENT);
      expect(log).not.toHaveBeenCalled();
    });

    it('should reject a secret that is not Base32', async () => {
      await runCommand(OtpModule, ['otp', '-s', NOT_BASE32_SECRET]);

      expect(error).toHaveBeenCalledExactlyOnceWith(SECRET_REQUIREMENT);
      expect(log).not.toHaveBeenCalled();
    });

    it('should reject a missing secret', async () => {
      await runCommand(OtpModule, ['otp']);

      expect(error).toHaveBeenCalledExactlyOnceWith(
        'The --secret option is required and must be a Base32 secret of at least 10 bytes (80 bits).',
      );
    });

    it('should exit non-zero so that a shell can branch on the failure', async () => {
      await runCommand(OtpModule, ['otp', '-s', TOO_SHORT_SECRET]);

      expect(process.exitCode).toBe(1);
    });

    it('should exit zero when the code is generated', async () => {
      await runCommand(OtpModule, ['otp', '-s', RECOMMENDED_SECRET]);

      expect(process.exitCode).toBeUndefined();
    });
  });
});
