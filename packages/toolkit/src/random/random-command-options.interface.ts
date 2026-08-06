import { CopyableCommandOptions } from '../copyable/index.js';

export interface RandomCommandOptions extends CopyableCommandOptions {
  uuid?: boolean;
  string?: boolean;
  length?: number;
  number?: boolean;
  // Kept as written on the command line so that values beyond Number.MAX_SAFE_INTEGER
  // survive until they are converted to a bigint.
  min?: string;
  max?: string;
}
