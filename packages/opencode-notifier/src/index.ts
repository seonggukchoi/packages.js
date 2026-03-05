import { createEventHandler } from './handlers/event-handler.js';
import { createToolAfterHandler, createToolBeforeHandler } from './handlers/tool-handler.js';
import { ensureIconCache } from './icon.js';
import { sendNotification } from './notification.js';
import { detectTerminal } from './terminal.js';

import type { Plugin } from '@opencode-ai/plugin';

export type { NotifyFunction, TerminalInfo } from './types.js';

export const OpencodeNotifier: Plugin = async ({ directory }) => {
  ensureIconCache();

  const termInfo = detectTerminal(directory);
  const context = `[${termInfo.app}] ${termInfo.projectName}`;

  const notify = (title: string, message: string, sound?: string): void => {
    sendNotification(context, termInfo.icon, title, message, sound);
  };

  return {
    event: createEventHandler(notify),
    'tool.execute.before': createToolBeforeHandler(notify),
    'tool.execute.after': createToolAfterHandler(notify),
  };
};
