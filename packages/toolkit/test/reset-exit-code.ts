// A failed command marks the run by assigning `process.exitCode`. Left in place it would
// make vitest itself exit non-zero after a test that asserts a failure, so it is reset
// around every test instead of in each spec that triggers one.
beforeEach(() => {
  process.exitCode = undefined;
});

afterEach(() => {
  process.exitCode = undefined;
});
