import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { EventKey, EventOptions, Locale, NotifierConfig } from './types.js';

const CONFIG_PATH = join(homedir(), '.config', 'opencode', 'opencode-notifier.json');

const SUPPORTED_LOCALES: ReadonlySet<string> = new Set<Locale>(['en', 'ko']);

const EVENT_KEYS: readonly EventKey[] = [
  'sessionStarted',
  'sessionCompleted',
  'sessionError',
  'sessionCompacted',
  'permissionChanged',
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

export function loadConfig(): NotifierConfig {
  if (!existsSync(CONFIG_PATH)) {
    return { locale: 'en', events: buildDefaultEvents() };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return {
      locale: SUPPORTED_LOCALES.has((parsed.locale as string) ?? '') ? (parsed.locale as Locale) : 'en',
      events: parseEvents(parsed.events as Record<string, unknown> | undefined),
    };
  } catch {
    return { locale: 'en', events: buildDefaultEvents() };
  }
}
