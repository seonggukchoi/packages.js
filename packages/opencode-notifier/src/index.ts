import { createChannels } from './channels/index.js';
import { loadConfig } from './config.js';
import { createEventHandler } from './handlers/event-handler.js';
import { createToolAfterHandler, createToolBeforeHandler } from './handlers/tool-handler.js';
import { getMessages } from './i18n/index.js';
import { ensureIconCache } from './icon.js';
import { createNotifier } from './notifier.js';
import { createSessionRegistry } from './session.js';
import { detectTerminal } from './terminal.js';

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
  NotificationData,
  NotifierConfig,
  NotifyFunction,
  SessionInfo,
  TelegramChannelConfig,
  TerminalInfo,
} from './types.js';

export type { NotificationDetail } from './handlers/notification.js';
export type { Notifier } from './notifier.js';
export type { SessionClient, SessionEvent, SessionRegistry } from './session.js';

export const OpencodeNotifier: Plugin = async ({ client, directory }) => {
  const config = loadConfig();
  const messages = getMessages(config.locale, config.events);

  ensureIconCache();

  const termInfo = detectTerminal(directory);
  const sessions = createSessionRegistry(client, termInfo.projectName);
  const { notify } = createNotifier(createChannels(config, termInfo.icon), termInfo.icon);

  return {
    event: createEventHandler(notify, messages, sessions),
    'tool.execute.before': createToolBeforeHandler(notify, messages, sessions),
    'tool.execute.after': createToolAfterHandler(notify, messages, sessions),
  };
};
