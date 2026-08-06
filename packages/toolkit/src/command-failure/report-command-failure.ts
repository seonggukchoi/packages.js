import { CommandFailureError } from './command-failure.error.js';

const FAILURE_EXIT_CODE = 1;

/**
 * Reports a failed command on stderr and marks the process as failed.
 *
 * An expected failure is printed as its message alone, since the user only needs to know
 * what to correct. Anything else is a defect rather than a usage mistake, so it is printed
 * whole to keep the stack available.
 *
 * Assigning `exitCode` rather than calling `process.exit` lets the runtime drain stderr and
 * close the application context before the process ends.
 */
export const reportCommandFailure = (error: Error): void => {
  if (error instanceof CommandFailureError) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = FAILURE_EXIT_CODE;
};
