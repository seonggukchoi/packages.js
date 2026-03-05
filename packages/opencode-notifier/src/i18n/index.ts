import { en } from './en.js';
import { ko } from './ko.js';

import type { Locale, Messages } from '../types.js';

const locales: Record<Locale, Messages> = { en, ko };

export function getMessages(locale: Locale): Messages {
  return locales[locale] || locales.en;
}
