vi.mock('./macos.js', () => ({
  createMacOSChannel: vi.fn(() => ({ type: 'macos', send: vi.fn() })),
}));

vi.mock('./telegram.js', () => ({
  createTelegramChannel: vi.fn(() => ({ type: 'telegram', send: vi.fn() })),
  formatTelegramMessage: vi.fn(),
}));

vi.mock('../config.js', () => ({
  resolveChannelEvents: vi.fn((globalEvents: Record<string, unknown>) => ({ ...globalEvents })),
}));

import { resolveChannelEvents } from '../config.js';

import { createMacOSChannel } from './macos.js';
import { createTelegramChannel } from './telegram.js';

import { createChannels } from './index.js';

import type { NotifierConfig } from '../types.js';

const mockedCreateMacOS = vi.mocked(createMacOSChannel);
const mockedCreateTelegram = vi.mocked(createTelegramChannel);
const mockedResolveChannelEvents = vi.mocked(resolveChannelEvents);

function buildConfig(overrides?: Partial<NotifierConfig>): NotifierConfig {
  return {
    locale: 'en',
    events: {
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
    },
    channels: { macos: { enabled: true } },
    ...overrides,
  };
}

describe('createChannels', () => {
  it('creates macOS channel when macos is enabled', () => {
    const config = buildConfig();
    const entries = createChannels(config, 'project', '/icon.png');

    expect(entries).toHaveLength(1);
    expect(entries[0]!.channel.type).toBe('macos');
    expect(mockedCreateMacOS).toHaveBeenCalledWith('project', '/icon.png');
  });

  it('does not create macOS channel when macos is disabled', () => {
    const config = buildConfig({ channels: { macos: { enabled: false } } });
    const entries = createChannels(config, 'project', '/icon.png');

    expect(entries).toHaveLength(0);
  });

  it('creates telegram channel when telegram is enabled with valid config', () => {
    const telegramConfig = {
      enabled: true,
      botToken: 'tok',
      chatId: '123',
    };
    const config = buildConfig({
      channels: {
        macos: { enabled: false },
        telegram: telegramConfig,
      },
    });
    const entries = createChannels(config, 'project', '/icon.png');

    expect(entries).toHaveLength(1);
    expect(entries[0]!.channel.type).toBe('telegram');
    expect(mockedCreateTelegram).toHaveBeenCalledWith(telegramConfig);
  });

  it('creates both channels when both are enabled', () => {
    const config = buildConfig({
      channels: {
        macos: { enabled: true },
        telegram: { enabled: true, botToken: 'tok', chatId: '123' },
      },
    });
    const entries = createChannels(config, 'project', '/icon.png');

    expect(entries).toHaveLength(2);
    expect(entries[0]!.channel.type).toBe('macos');
    expect(entries[1]!.channel.type).toBe('telegram');
  });

  it('does not create telegram channel when telegram is disabled', () => {
    const config = buildConfig({
      channels: {
        macos: { enabled: true },
        telegram: { enabled: false, botToken: 'tok', chatId: '123' },
      },
    });
    const entries = createChannels(config, 'project', '/icon.png');

    expect(entries).toHaveLength(1);
    expect(entries[0]!.channel.type).toBe('macos');
  });

  it('resolves channel events with per-channel overrides', () => {
    const channelEvents = { sessionStarted: { enabled: false } };
    const config = buildConfig({
      channels: {
        macos: { enabled: true, events: channelEvents },
      },
    });

    createChannels(config, 'project', '/icon.png');

    expect(mockedResolveChannelEvents).toHaveBeenCalledWith(config.events, channelEvents);
  });

  it('returns empty array when no channels are configured', () => {
    const config = buildConfig({ channels: {} });
    const entries = createChannels(config, 'project', '/icon.png');

    expect(entries).toHaveLength(0);
  });
});
