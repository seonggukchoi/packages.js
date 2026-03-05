import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { Locale, NotifierConfig } from './types.js';

const CONFIG_PATH = join(homedir(), '.config', 'opencode', 'opencode-notifier.json');

const SUPPORTED_LOCALES: ReadonlySet<string> = new Set<Locale>(['en', 'ko']);

const DEFAULT_CONFIG: NotifierConfig = {
  locale: 'en',
};

export function loadConfig(): NotifierConfig {
  if (!existsSync(CONFIG_PATH)) {
    return DEFAULT_CONFIG;
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<NotifierConfig>;

    return {
      locale: SUPPORTED_LOCALES.has(parsed.locale ?? '') ? (parsed.locale as Locale) : DEFAULT_CONFIG.locale,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
