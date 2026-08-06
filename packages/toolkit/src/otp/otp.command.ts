import { Command, Option } from 'nest-commander';
import { createGuardrails, generate } from 'otplib';

import { CommandFailureError } from '../command-failure/index.js';
import { CopyableCommandRunner } from '../copyable/index.js';

import { OtpCommandOptions } from './otp-command-options.interface.js';

// otplib rejects secrets shorter than 128 bits by default. This command only consumes
// secrets issued elsewhere, so refusing them blocks real accounts without making any of
// them stronger. 80 bits is the floor RFC 4226 defines and what authenticator apps emit.
const GUARDRAILS = createGuardrails({ MIN_SECRET_BYTES: 10 });

const MINIMUM_SECRET_DESCRIPTION = 'a Base32 secret of at least 10 bytes (80 bits)';

@Command({ name: 'otp', description: 'Generate a OTP code.' })
export class OtpCommand extends CopyableCommandRunner<OtpCommandOptions> {
  public override async run(passedParams: string[], options?: OtpCommandOptions | undefined): Promise<void> {
    if (!options) {
      return;
    }

    if (!options.secret) {
      throw new CommandFailureError(`The --secret option is required and must be ${MINIMUM_SECRET_DESCRIPTION}.`);
    }

    await this.print(await this.generateCode(options.secret), options.copy);
  }

  @Option({ flags: '-s, --secret <secret>', description: 'Generate a OTP code.' })
  private generateOtp(secret: string): string {
    return secret;
  }

  /**
   * otplib reports an unusable secret by throwing, and what it throws depends on the cause:
   * its own error when the secret is too short, a plain `Error` raised by the Base32 decoder
   * when the secret is not Base32 at all. Neither names the option to correct, and both are
   * the same mistake from here, so they collapse into one failure.
   */
  private async generateCode(secret: string): Promise<string> {
    try {
      return await generate({ secret, guardrails: GUARDRAILS });
    } catch (error) {
      throw new CommandFailureError(`The --secret option must be ${MINIMUM_SECRET_DESCRIPTION}.`, { cause: error });
    }
  }
}
