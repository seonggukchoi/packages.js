export class InvalidUuidVersionException extends Error {
  constructor(version: unknown) {
    super(`Invalid UUID version: ${version}`);
  }
}
