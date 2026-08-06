/**
 * A failure the user is expected to correct, carrying a message written for the terminal.
 *
 * Commands throw this instead of letting the error of a dependency reach the user: such an
 * error names a class the user never imported and says nothing about which option is at
 * fault. The original is kept on `cause` so it stays available while debugging.
 */
export class CommandFailureError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'CommandFailureError';
  }
}
