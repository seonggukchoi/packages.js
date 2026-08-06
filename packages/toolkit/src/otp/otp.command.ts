import { Command, Option } from 'nest-commander';
import { createGuardrails, generate } from 'otplib';

import { CopyableCommandRunner } from '../copyable/index.js';

import { OtpCommandOptions } from './otp-command-options.interface.js';

// otplib rejects secrets shorter than 128 bits by default. This command only consumes
// secrets issued elsewhere, so refusing them blocks real accounts without making any of
// them stronger. 80 bits is the floor RFC 4226 defines and what authenticator apps emit.
const GUARDRAILS = createGuardrails({ MIN_SECRET_BYTES: 10 });

@Command({ name: 'otp', description: 'Generate a OTP code.' })
export class OtpCommand extends CopyableCommandRunner<OtpCommandOptions> {
  public override async run(passedParams: string[], options?: OtpCommandOptions | undefined): Promise<void> {
    if (!this.validateOptions(options)) {
      return;
    }

    await this.print(await generate({ secret: options!.secret, guardrails: GUARDRAILS }), options!.copy);
  }

  @Option({ flags: '-s, --secret <secret>', description: 'Generate a OTP code.' })
  private generateOtp(secret: string): string {
    return secret;
  }

  private validateOptions(options?: OtpCommandOptions | undefined): boolean {
    if (!options) {
      return false;
    }

    return true;
  }
}
