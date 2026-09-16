vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock-home'),
}));

import { existsSync, readFileSync } from 'node:fs';

import { loadConfig, resolveChannelEvents } from './config.js';

import type { EventKey, EventOptions } from './types.js';

const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFileSync = vi.mocked(readFileSync);

describe('loadConfig', () => {
  it('returns default config when config file does not exist', () => {
    mockedExistsSync.mockReturnValue(false);

    const config = loadConfig();

    expect(config.locale).toBe('en');
    expect(config.events.sessionStarted.enabled).toBe(true);
    expect(config.events.sessionCompleted.enabled).toBe(true);
    expect(config.events.sessionInterrupted.enabled).toBe(true);
    expect(config.events.sessionCompacted.enabled).toBe(true);
    expect(config.events.permissionRequested.enabled).toBe(true);
    expect(config.events.decisionNeeded.enabled).toBe(true);
    expect(config.events.subagentStarted.enabled).toBe(true);
    expect(config.events.subagentCompleted.enabled).toBe(true);
    expect(config.events.toolExecuting.enabled).toBe(true);
    expect(config.events.toolCompleted.enabled).toBe(true);
    expect(config.channels).toEqual({ macos: { enabled: true } });
  });

  it('parses a valid config file correctly', () => {
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

  it('parses the workspace label when provided', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({ locale: 'en', workspace: 'home-workspace', channels: { macos: { enabled: true } } }),
    );

    const config = loadConfig();

    expect(config.workspace).toBe('home-workspace');
  });

  it('leaves workspace undefined when not provided', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(JSON.stringify({ locale: 'en', channels: { macos: { enabled: true } } }));

    const config = loadConfig();

    expect(config.workspace).toBeUndefined();
  });

  it('ignores a non-string workspace value', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(JSON.stringify({ locale: 'en', workspace: 123, channels: { macos: { enabled: true } } }));

    const config = loadConfig();

    expect(config.workspace).toBeUndefined();
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
          sessionInterrupted: 42,
          sessionCompacted: { enabled: false },
        },
        channels: { macos: { enabled: true } },
      }),
    );

    const config = loadConfig();

    expect(config.events.sessionStarted.enabled).toBe(true);
    expect(config.events.sessionCompleted.enabled).toBe(true);
    expect(config.events.sessionInterrupted.enabled).toBe(true);
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
          sessionInterrupted: { enabled: false },
        },
        channels: { macos: { enabled: true } },
      }),
    );

    const config = loadConfig();

    expect(config.events.sessionInterrupted.enabled).toBe(false);
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

  it('parses a positive integer connectAttemptTimeoutMs', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {
          telegram: {
            enabled: true,
            botToken: 'tok',
            chatId: '123',
            connectAttemptTimeoutMs: 5000,
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.telegram?.connectAttemptTimeoutMs).toBe(5000);
  });

  it('leaves connectAttemptTimeoutMs undefined when it is not provided', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {
          telegram: {
            enabled: true,
            botToken: 'tok',
            chatId: '123',
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.telegram?.connectAttemptTimeoutMs).toBeUndefined();
  });

  it('ignores a non-numeric connectAttemptTimeoutMs', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {
          telegram: {
            enabled: true,
            botToken: 'tok',
            chatId: '123',
            connectAttemptTimeoutMs: '5000',
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.telegram?.connectAttemptTimeoutMs).toBeUndefined();
  });

  it('ignores a fractional connectAttemptTimeoutMs, which Node rejects', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {
          telegram: {
            enabled: true,
            botToken: 'tok',
            chatId: '123',
            connectAttemptTimeoutMs: 1500.5,
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.telegram?.connectAttemptTimeoutMs).toBeUndefined();
  });

  it('parses the largest connectAttemptTimeoutMs Node accepts', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {
          telegram: {
            enabled: true,
            botToken: 'tok',
            chatId: '123',
            connectAttemptTimeoutMs: 2_147_483_647,
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.telegram?.connectAttemptTimeoutMs).toBe(2_147_483_647);
  });

  it('ignores a connectAttemptTimeoutMs beyond the range Node accepts', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {
          telegram: {
            enabled: true,
            botToken: 'tok',
            chatId: '123',
            connectAttemptTimeoutMs: 2_147_483_648,
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.telegram?.connectAttemptTimeoutMs).toBeUndefined();
  });

  it('ignores a zero or negative connectAttemptTimeoutMs', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'en',
        channels: {
          telegram: {
            enabled: true,
            botToken: 'tok',
            chatId: '123',
            connectAttemptTimeoutMs: 0,
          },
        },
      }),
    );

    const config = loadConfig();

    expect(config.channels.telegram?.connectAttemptTimeoutMs).toBeUndefined();
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

describe('config file location', () => {
  beforeEach(() => {
    delete process.env.CODEX_HOME;
  });

  afterEach(() => {
    delete process.env.CODEX_HOME;
  });

  it('reads the config from the plugin directory under ~/.codex', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(JSON.stringify({ locale: 'ko' }));

    const config = loadConfig();

    expect(config.locale).toBe('ko');
    expect(mockedExistsSync).toHaveBeenCalledWith('/mock-home/.codex/plugins/codex-notifier/config.json');
    expect(mockedReadFileSync).toHaveBeenCalledWith('/mock-home/.codex/plugins/codex-notifier/config.json', 'utf-8');
  });

  it('follows CODEX_HOME when it is set', () => {
    process.env.CODEX_HOME = '/custom/codex-home';
    mockedExistsSync.mockReturnValue(false);

    loadConfig();

    expect(mockedExistsSync).toHaveBeenCalledWith('/custom/codex-home/plugins/codex-notifier/config.json');
  });

  it('defaults channels to macos enabled when the config has no channels key', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        locale: 'ko',
        events: {
          sessionCompleted: { enabled: false },
        },
      }),
    );

    const config = loadConfig();

    expect(config.locale).toBe('ko');
    expect(config.events.sessionCompleted.enabled).toBe(false);
    expect(config.channels).toEqual({ macos: { enabled: true } });
  });
});

describe('resolveChannelEvents', () => {
  function buildEvents(overrides?: Partial<Record<EventKey, EventOptions>>): Record<EventKey, EventOptions> {
    const defaults: Record<EventKey, EventOptions> = {
      sessionStarted: { enabled: true },
      sessionCompleted: { enabled: true },
      sessionInterrupted: { enabled: true },
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
