#!/usr/bin/env node

import { createChannels } from './channels/index.js';
import { loadConfig } from './config.js';
import { buildNotification, shouldSendNotification } from './handlers/hook-handler.js';
import { getMessages } from './i18n/index.js';
import { ensureIconCache } from './icon.js';
import { detectTerminal } from './terminal.js';

import type { EventKey, HookData } from './types.js';

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

function readStdin(): Promise<HookData> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve({});
      return;
    }

    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data) as HookData);
      } catch {
        resolve({});
      }
    });
    process.stdin.on('error', () => resolve({}));
  });
}

async function main(): Promise<void> {
  const eventKey = process.argv[2] as EventKey;
  if (!eventKey || !EVENT_KEYS.includes(eventKey)) {
    return;
  }

  const hookData = await readStdin();
  if (!shouldSendNotification(eventKey, hookData)) {
    return;
  }

  const config = loadConfig();
  const messages = getMessages(config.locale, config.events);

  ensureIconCache();

  const directory = hookData.cwd || process.cwd();
  const termInfo = detectTerminal(directory);
  const context = termInfo.projectName;

  const notification = buildNotification(eventKey, messages, hookData);

  const channelEntries = createChannels(config, context, termInfo.icon);
  for (const { channel, events } of channelEntries) {
    if (!events[eventKey].enabled) {
      continue;
    }
    try {
      const result = channel.send({
        title: notification.title,
        message: notification.message,
        context,
        icon: termInfo.icon,
        sound: notification.sound,
      });
      if (result instanceof Promise) {
        result.catch(() => {});
      }
    } catch {
      // Continue to next channel
    }
  }
}

main().catch(() => process.exit(0));
