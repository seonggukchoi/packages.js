import { resolveChannelEvents } from '../config.js';

import { createMacOSChannel } from './macos.js';
import { createTelegramChannel } from './telegram.js';

import type { ChannelEntry, NotifierConfig } from '../types.js';

export function createChannels(config: NotifierConfig, icon: string): ChannelEntry[] {
  const entries: ChannelEntry[] = [];

  if (config.channels.macos?.enabled) {
    entries.push({
      channel: createMacOSChannel(icon),
      events: resolveChannelEvents(config.events, config.channels.macos.events),
    });
  }

  if (config.channels.telegram?.enabled) {
    entries.push({
      channel: createTelegramChannel(config.channels.telegram, config.workspace),
      events: resolveChannelEvents(config.events, config.channels.telegram.events),
    });
  }

  return entries;
}
