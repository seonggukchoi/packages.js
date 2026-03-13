vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock-home'),
}));

import { existsSync, readFileSync } from 'node:fs';

import { loadConfig } from './config.js';

const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFileSync = vi.mocked(readFileSync);

describe('loadConfig', () => {
  it('returns default config when config file does not exist', () => {
    mockedExistsSync.mockReturnValue(false);

    const config = loadConfig();

    expect(config.locale).toBe('en');
    expect(config.events.sessionStarted.enabled).toBe(true);
    expect(config.events.sessionCompleted.enabled).toBe(true);
    expect(config.events.sessionError.enabled).toBe(true);
    expect(config.events.sessionCompacted.enabled).toBe(true);
    expect(config.events.permissionRequested.enabled).toBe(true);
    expect(config.events.decisionNeeded.enabled).toBe(true);
    expect(config.events.subagentStarted.enabled).toBe(true);
    expect(config.events.subagentCompleted.enabled).toBe(true);
    expect(config.events.toolExecuting.enabled).toBe(true);
    expect(config.events.toolCompleted.enabled).toBe(true);
  });

  it('parses valid config file correctly', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'ko',
        events: {
          sessionStarted: { enabled: true },
          sessionCompleted: { enabled: false },
        },
      }),
    );

    const config = loadConfig();

    expect(config.locale).toBe('ko');
    expect(config.events.sessionStarted.enabled).toBe(true);
    expect(config.events.sessionCompleted.enabled).toBe(false);
  });

  it('falls back to en locale for unsupported locale', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(JSON.stringify({ locale: 'fr' }));

    const config = loadConfig();

    expect(config.locale).toBe('en');
  });

  it('returns default events when events key is missing', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(JSON.stringify({ locale: 'en' }));

    const config = loadConfig();

    expect(config.events.sessionStarted.enabled).toBe(true);
    expect(config.events.toolCompleted.enabled).toBe(true);
  });

  it('handles malformed event entries by skipping non-object entries', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        events: {
          sessionStarted: 'not-an-object',
          sessionCompleted: null,
          sessionError: 42,
          sessionCompacted: { enabled: false },
        },
      }),
    );

    const config = loadConfig();

    expect(config.events.sessionStarted.enabled).toBe(true);
    expect(config.events.sessionCompleted.enabled).toBe(true);
    expect(config.events.sessionError.enabled).toBe(true);
    expect(config.events.sessionCompacted.enabled).toBe(false);
  });

  it('handles JSON parse error gracefully', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue('{ invalid json }}}');

    const config = loadConfig();

    expect(config.locale).toBe('en');
    expect(config.events.sessionStarted.enabled).toBe(true);
  });

  it('handles event with custom message', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        events: {
          sessionStarted: { enabled: true, message: 'Custom start message' },
        },
      }),
    );

    const config = loadConfig();

    expect(config.events.sessionStarted.enabled).toBe(true);
    expect(config.events.sessionStarted.message).toBe('Custom start message');
  });

  it('handles event with enabled: false', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        events: {
          sessionError: { enabled: false },
        },
      }),
    );

    const config = loadConfig();

    expect(config.events.sessionError.enabled).toBe(false);
  });

  it('defaults enabled to true when enabled is not a boolean', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        events: {
          sessionStarted: { enabled: 'yes' },
        },
      }),
    );

    const config = loadConfig();

    expect(config.events.sessionStarted.enabled).toBe(true);
  });

  it('ignores non-string message in event options', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        events: {
          sessionStarted: { enabled: true, message: 123 },
        },
      }),
    );

    const config = loadConfig();

    expect(config.events.sessionStarted.enabled).toBe(true);
    expect(config.events.sessionStarted.message).toBeUndefined();
  });

  it('falls back to en when locale is null', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(JSON.stringify({ locale: null }));

    const config = loadConfig();

    expect(config.locale).toBe('en');
  });
});
