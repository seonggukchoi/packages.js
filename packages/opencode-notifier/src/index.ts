import { createChannels } from './channels/index.js';
import { loadConfig } from './config.js';
import { createEventHandler } from './handlers/event-handler.js';
import { createToolAfterHandler, createToolBeforeHandler } from './handlers/tool-handler.js';
import { getMessages } from './i18n/index.js';
import { ensureIconCache } from './icon.js';
import { detectTerminal } from './terminal.js';

import type { EventKey } from './types.js';
import type { Plugin } from '@opencode-ai/plugin';

export type {
  ChannelConfig,
  ChannelEntry,
  ChannelsConfig,
  EventKey,
  EventOptions,
  Locale,
  MacOSChannelConfig,
  Messages,
  NotificationChannel,
  NotifierConfig,
  NotifyFunction,
  TelegramChannelConfig,
  TerminalInfo,
} from './types.js';

export const OpencodeNotifier: Plugin = async ({ directory }) => {
  const config = loadConfig();
  const messages = getMessages(config.locale, config.events);

  ensureIconCache();

  const termInfo = detectTerminal(directory);
  const context = termInfo.projectName;

  const channelEntries = createChannels(config, context, termInfo.icon);

  const notify = (eventKey: EventKey, title: string, message: string, sound?: string): void => {
    for (const { channel, events } of channelEntries) {
      if (!events[eventKey].enabled) {
        continue;
      }
      channel.send({ title, message, context, icon: termInfo.icon, sound });
    }
  };

  return {
    event: createEventHandler(notify, messages),
    'tool.execute.before': createToolBeforeHandler(notify, messages),
    'tool.execute.after': createToolAfterHandler(notify, messages),
  };
};
