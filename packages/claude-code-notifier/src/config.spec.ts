vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock-home'),
}));

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { loadConfig, migrateV1Config, resolveChannelEvents } from './config.js';

import type { EventKey, EventOptions } from './types.js';

const mockedExistsSync = vi.mocked(existsSync);
const mockedMkdirSync = vi.mocked(mkdirSync);
const mockedReadFileSync = vi.mocked(readFileSync);
const mockedWriteFileSync = vi.mocked(writeFileSync);

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
    expect(config.channels).toEqual({ macos: { enabled: true } });
  });

  it('parses valid v2 config file correctly', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'ko',
        events: {
          sessionStarted: { enabled: true },
          sessionCompleted: { enabled: false },
        },
        channels: {
          macos: { enabled: true },
          telegram: {
            enabled: true,
            botToken: 'tok123',
            chatId: '456',
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.locale).toBe('ko');
    expect(config.events.sessionStarted.enabled).toBe(true);
    expect(config.events.sessionCompleted.enabled).toBe(false);
    expect(config.channels.macos?.enabled).toBe(true);
    expect(config.channels.telegram?.enabled).toBe(true);
    expect(config.channels.telegram?.botToken).toBe('tok123');
    expect(config.channels.telegram?.chatId).toBe('456');
  });

  it('falls back to en locale for unsupported locale', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(JSON.stringify({ locale: 'fr', channels: { macos: { enabled: true } } }));

    const config = loadConfig();

    expect(config.locale).toBe('en');
  });

  it('returns default events when events key is missing', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(JSON.stringify({ locale: 'en', channels: { macos: { enabled: true } } }));

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
        channels: { macos: { enabled: true } },
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
    expect(config.channels).toEqual({ macos: { enabled: true } });
  });

  it('handles event with custom message', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        events: {
          sessionStarted: { enabled: true, message: 'Custom start message' },
        },
        channels: { macos: { enabled: true } },
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
        channels: { macos: { enabled: true } },
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
        channels: { macos: { enabled: true } },
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
        channels: { macos: { enabled: true } },
      }),
    );

    const config = loadConfig();

    expect(config.events.sessionStarted.enabled).toBe(true);
    expect(config.events.sessionStarted.message).toBeUndefined();
  });

  it('falls back to en when locale is null', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(JSON.stringify({ locale: null, channels: { macos: { enabled: true } } }));

    const config = loadConfig();

    expect(config.locale).toBe('en');
  });

  it('parses channel-level event overrides', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        events: {
          sessionStarted: { enabled: true },
        },
        channels: {
          telegram: {
            enabled: true,
            botToken: 'tok',
            chatId: '123',
            events: {
              sessionStarted: { enabled: false },
              toolExecuting: { enabled: true, message: 'custom' },
            },
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.telegram?.events?.sessionStarted?.enabled).toBe(false);
    expect(config.channels.telegram?.events?.toolExecuting?.enabled).toBe(true);
    expect(config.channels.telegram?.events?.toolExecuting?.message).toBe('custom');
  });

  it('ignores telegram config when botToken is missing', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {
          telegram: {
            enabled: true,
            chatId: '123',
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.telegram).toBeUndefined();
  });

  it('ignores telegram config when chatId is missing', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {
          telegram: {
            enabled: true,
            botToken: 'tok',
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.telegram).toBeUndefined();
  });

  it('defaults macos channel to enabled when channels object has no macos key', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {},
      }),
    );

    const config = loadConfig();

    expect(config.channels.macos?.enabled).toBe(true);
  });

  it('defaults macos channel to enabled when channels is null', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: null,
      }),
    );

    const config = loadConfig();

    expect(config.channels.macos?.enabled).toBe(true);
  });

  it('defaults macos channel enabled to true when enabled is not a boolean', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {
          macos: {
            enabled: 'yes',
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.macos?.enabled).toBe(true);
  });

  it('converts numeric chatId to string', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {
          telegram: {
            enabled: true,
            botToken: 'tok',
            chatId: 987654,
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.telegram?.chatId).toBe('987654');
  });

  it('defaults telegram enabled to false when enabled is not a boolean', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {
          telegram: {
            enabled: 'yes',
            botToken: 'tok',
            chatId: '123',
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.telegram?.enabled).toBe(false);
  });

  it('ignores empty channel event objects', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {
          macos: {
            enabled: true,
            events: {},
          },
          telegram: {
            enabled: true,
            botToken: 'tok',
            chatId: '123',
            events: {},
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.macos?.events).toBeUndefined();
    expect(config.channels.telegram?.events).toBeUndefined();
  });

  it('defaults channel event enabled to true when override enabled is not a boolean', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {
          telegram: {
            enabled: true,
            botToken: 'tok',
            chatId: '123',
            events: {
              sessionStarted: {
                enabled: 'yes',
              },
            },
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.telegram?.events?.sessionStarted?.enabled).toBe(true);
  });
});

describe('v1 config migration', () => {
  it('migrates v1 config (no channels key) and writes to file', () => {
    mockedExistsSync.mockImplementation((path: unknown) => {
      const pathStr = path as string;
      if (pathStr.endsWith('config.json')) {
        return true;
      }
      // plugin dir exists
      if (pathStr.endsWith('claude-code-notifier')) {
        return true;
      }
      return false;
    });
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
    expect(config.events.sessionCompleted.enabled).toBe(false);
    expect(config.channels.macos?.enabled).toBe(true);
    expect(mockedWriteFileSync).toHaveBeenCalledTimes(1);

    const writtenContent = JSON.parse(mockedWriteFileSync.mock.calls[0]![1] as string) as Record<string, unknown>;
    expect(writtenContent.channels).toEqual({ macos: { enabled: true } });
  });

  it('creates plugin directory during migration if it does not exist', () => {
    mockedExistsSync.mockImplementation((path: unknown) => {
      const pathStr = path as string;
      if (pathStr.endsWith('config.json')) {
        return true;
      }
      return false;
    });
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        events: {},
      }),
    );

    loadConfig();

    expect(mockedMkdirSync).toHaveBeenCalledWith('/mock-home/.claude/plugins/claude-code-notifier', { recursive: true });
  });

  it('handles write failure during migration gracefully', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        events: {},
      }),
    );
    mockedWriteFileSync.mockImplementation(() => {
      throw new Error('permission denied');
    });

    const config = loadConfig();

    expect(config.locale).toBe('en');
    expect(config.channels.macos?.enabled).toBe(true);
  });
});

describe('migrateV1Config', () => {
  it('adds channels key with macos enabled', () => {
    const result = migrateV1Config({ locale: 'ko', events: {} });

    expect(result.channels).toEqual({ macos: { enabled: true } });
    expect(result.locale).toBe('ko');
    expect(result.events).toEqual({});
  });
});

describe('resolveChannelEvents', () => {
  function buildEvents(overrides?: Partial<Record<EventKey, EventOptions>>): Record<EventKey, EventOptions> {
    const defaults: Record<EventKey, EventOptions> = {
      sessionStarted: { enabled: true },
      sessionCompleted: { enabled: true },
      sessionError: { enabled: true },
      sessionCompacted: { enabled: true },
      permissionRequested: { enabled: true },
      decisionNeeded: { enabled: true },
      subagentStarted: { enabled: true },
      subagentCompleted: { enabled: true },
      toolExecuting: { enabled: true },
      toolCompleted: { enabled: true },
    };
    return { ...defaults, ...overrides };
  }

  it('returns a copy of global events when channelEvents is undefined', () => {
    const globalEvents = buildEvents({ toolExecuting: { enabled: false } });

    const result = resolveChannelEvents(globalEvents);

    expect(result.toolExecuting.enabled).toBe(false);
    expect(result.sessionStarted.enabled).toBe(true);
    expect(result).not.toBe(globalEvents);
  });

  it('overrides global events with channel-level events', () => {
    const globalEvents = buildEvents({
      sessionStarted: { enabled: true },
      toolExecuting: { enabled: false },
    });
    const channelEvents: Partial<Record<EventKey, EventOptions>> = {
      sessionStarted: { enabled: false },
      toolExecuting: { enabled: true },
    };

    const result = resolveChannelEvents(globalEvents, channelEvents);

    expect(result.sessionStarted.enabled).toBe(false);
    expect(result.toolExecuting.enabled).toBe(true);
    expect(result.sessionCompleted.enabled).toBe(true);
  });

  it('merges message from channel override with global enabled', () => {
    const globalEvents = buildEvents({
      sessionStarted: { enabled: true },
    });
    const channelEvents: Partial<Record<EventKey, EventOptions>> = {
      sessionStarted: { enabled: true, message: 'channel override' },
    };

    const result = resolveChannelEvents(globalEvents, channelEvents);

    expect(result.sessionStarted.message).toBe('channel override');
    expect(result.sessionStarted.enabled).toBe(true);
  });

  it('does not mutate the original global events', () => {
    const globalEvents = buildEvents();
    const channelEvents: Partial<Record<EventKey, EventOptions>> = {
      sessionStarted: { enabled: false },
    };

    resolveChannelEvents(globalEvents, channelEvents);

    expect(globalEvents.sessionStarted.enabled).toBe(true);
  });
});
