import { loadConfig } from './config.js';
import { createEventHandler } from './handlers/event-handler.js';
import { createPermissionHandler } from './handlers/permission-handler.js';
import { createToolAfterHandler, createToolBeforeHandler } from './handlers/tool-handler.js';
import { getMessages } from './i18n/index.js';
import { ensureIconCache } from './icon.js';
import { sendNotification } from './notification.js';
import { detectTerminal } from './terminal.js';

import type { EventKey } from './types.js';
import type { Plugin } from '@opencode-ai/plugin';

export type { EventKey, EventOptions, Locale, Messages, NotifierConfig, NotifyFunction, TerminalInfo } from './types.js';

export const OpencodeNotifier: Plugin = async ({ directory }) => {
  const config = loadConfig();
  const messages = getMessages(config.locale, config.events);

  ensureIconCache();

  const termInfo = detectTerminal(directory);
  const context = termInfo.projectName;

  const notify = (eventKey: EventKey, title: string, message: string, sound?: string): void => {
    if (!config.events[eventKey].enabled) {
      return;
    }
    sendNotification(context, termInfo.icon, title, message, sound);
  };

  return {
    event: createEventHandler(notify, messages),
    'permission.ask': createPermissionHandler(notify, messages),
    'tool.execute.before': createToolBeforeHandler(notify, messages),
    'tool.execute.after': createToolAfterHandler(notify, messages),
  };
};
