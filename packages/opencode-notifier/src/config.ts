import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { ChannelsConfig, EventKey, EventOptions, Locale, NotifierConfig, TelegramChannelConfig } from './types.js';

const CONFIG_PATH = join(homedir(), '.config', 'opencode', 'opencode-notifier.json');

const SUPPORTED_LOCALES: ReadonlySet<string> = new Set<Locale>(['en', 'ko']);

const EVENT_KEYS: readonly EventKey[] = [
  'sessionStarted',
  'sessionCompleted',
  'sessionError',
  'sessionCompacted',
  'permissionRequested',
  'decisionNeeded',
  'subagentStarted',
  'subagentCompleted',
  'toolExecuting',
  'toolCompleted',
];

function buildDefaultEvents(): Record<EventKey, EventOptions> {
  const events = {} as Record<EventKey, EventOptions>;
  for (const key of EVENT_KEYS) {
    events[key] = { enabled: true };
  }
  return events;
}

function buildDefaultConfig(): NotifierConfig {
  return { locale: 'en', events: buildDefaultEvents(), channels: { macos: { enabled: true } } };
}

function parseEvents(raw: Record<string, unknown> | undefined): Record<EventKey, EventOptions> {
  const defaults = buildDefaultEvents();
  if (!raw) {
    return defaults;
  }

  for (const key of EVENT_KEYS) {
    const entry = raw[key];
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }

    const partial = entry as Partial<EventOptions>;
    defaults[key] = {
      enabled: typeof partial.enabled === 'boolean' ? partial.enabled : true,
      ...(typeof partial.message === 'string' ? { message: partial.message } : {}),
    };
  }

  return defaults;
}

function parseChannelEvents(raw: Record<string, unknown> | undefined): Partial<Record<EventKey, EventOptions>> | undefined {
  if (!raw) {
    return undefined;
  }

  const result: Partial<Record<EventKey, EventOptions>> = {};
  let hasEntries = false;

  for (const key of EVENT_KEYS) {
    const entry = raw[key];
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }

    const partial = entry as Partial<EventOptions>;
    result[key] = {
      enabled: typeof partial.enabled === 'boolean' ? partial.enabled : true,
      ...(typeof partial.message === 'string' ? { message: partial.message } : {}),
    };
    hasEntries = true;
  }

  return hasEntries ? result : undefined;
}

function parseTelegramConfig(raw: Record<string, unknown>): TelegramChannelConfig | undefined {
  const enabled = typeof raw.enabled === 'boolean' ? raw.enabled : false;
  const botToken = typeof raw.botToken === 'string' ? raw.botToken : '';
  const chatId = typeof raw.chatId === 'string' ? raw.chatId : String(raw.chatId ?? '');

  if (!botToken || !chatId) {
    return undefined;
  }

  return {
    enabled,
    botToken,
    chatId,
    events: parseChannelEvents(raw.events as Record<string, unknown> | undefined),
  };
}

function parseChannels(raw: Record<string, unknown> | undefined): ChannelsConfig {
  if (!raw) {
    return { macos: { enabled: true } };
  }

  const channels: ChannelsConfig = {};

  const macosRaw = raw.macos;
  if (typeof macosRaw === 'object' && macosRaw !== null) {
    const macosObj = macosRaw as Record<string, unknown>;
    channels.macos = {
      enabled: typeof macosObj.enabled === 'boolean' ? macosObj.enabled : true,
      events: parseChannelEvents(macosObj.events as Record<string, unknown> | undefined),
    };
  } else {
    channels.macos = { enabled: true };
  }

  const telegramRaw = raw.telegram;
  if (typeof telegramRaw === 'object' && telegramRaw !== null) {
    const config = parseTelegramConfig(telegramRaw as Record<string, unknown>);
    if (config) {
      channels.telegram = config;
    }
  }

  return channels;
}

function isV1Config(parsed: Record<string, unknown>): boolean {
  return !('channels' in parsed);
}

export function migrateV1Config(parsed: Record<string, unknown>): Record<string, unknown> {
  return {
    ...parsed,
    channels: { macos: { enabled: true } },
  };
}

export function resolveChannelEvents(
  globalEvents: Record<EventKey, EventOptions>,
  channelEvents?: Partial<Record<EventKey, EventOptions>>,
): Record<EventKey, EventOptions> {
  if (!channelEvents) {
    return { ...globalEvents };
  }

  const resolved = {} as Record<EventKey, EventOptions>;
  for (const key of EVENT_KEYS) {
    const channelOverride = channelEvents[key];
    if (channelOverride) {
      resolved[key] = { ...globalEvents[key], ...channelOverride };
    } else {
      resolved[key] = { ...globalEvents[key] };
    }
  }

  return resolved;
}

export function loadConfig(): NotifierConfig {
  if (!existsSync(CONFIG_PATH)) {
    return buildDefaultConfig();
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    let parsed = JSON.parse(raw) as Record<string, unknown>;

    if (isV1Config(parsed)) {
      parsed = migrateV1Config(parsed);
      try {
        writeFileSync(CONFIG_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
      } catch {
        // Ignore write failures (e.g., read-only filesystem)
      }
    }

    return {
      locale: SUPPORTED_LOCALES.has((parsed.locale as string) ?? '') ? (parsed.locale as Locale) : 'en',
      events: parseEvents(parsed.events as Record<string, unknown> | undefined),
      channels: parseChannels(parsed.channels as Record<string, unknown> | undefined),
    };
  } catch {
    return buildDefaultConfig();
  }
}
