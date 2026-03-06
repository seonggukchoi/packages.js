import { en } from './en.js';
import { ko } from './ko.js';

import type { EventKey, EventOptions, Locale, Messages } from '../types.js';

const locales: Record<Locale, Messages> = { en, ko };

const TEMPLATE_VARS: Partial<Record<EventKey, string>> = {
  decisionNeeded: 'question',
  subagentStarted: 'description',
  toolExecuting: 'toolName',
  toolCompleted: 'toolName',
};

export function getMessages(locale: Locale, events: Record<EventKey, EventOptions>): Messages {
  const base = { ...(locales[locale] || locales.en) };

  for (const [key, options] of Object.entries(events) as [EventKey, EventOptions][]) {
    if (!options.message) {
      continue;
    }

    const templateVar = TEMPLATE_VARS[key];
    if (templateVar) {
      const template = options.message;
      (base as Record<string, unknown>)[key] = (arg: string) => template.replaceAll(`{{${templateVar}}}`, arg);
    } else {
      (base as Record<string, unknown>)[key] = options.message;
    }
  }

  return base;
}
