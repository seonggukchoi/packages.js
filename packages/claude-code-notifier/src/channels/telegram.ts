import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';
import { hostname } from 'node:os';

import type { NotificationChannel, TelegramChannelConfig } from '../types.js';

/**
 * Node's own default is 250 ms. On a dual-stack answer such as api.telegram.org that is short
 * enough to abandon a healthy IPv4 handshake on a slow link, and the IPv6 attempt that follows
 * fails outright on hosts that only hold a link-local or unique-local address. The wider window
 * lets the IPv4 attempt finish. Changing a process-wide default is safe here because the notifier
 * runs as a one-shot hook process that exits right after delivery.
 */
export const DEFAULT_CONNECT_ATTEMPT_TIMEOUT_MS = 2000;

function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

export function resolveWorkspaceLabel(workspace?: string): string {
  const trimmed = workspace?.trim();
  return trimmed ? trimmed : hostname();
}

export function formatTelegramMessage(title: string, message: string, context: string): string {
  return `*${escapeMarkdownV2(title)}*\n${escapeMarkdownV2(context)}: ${escapeMarkdownV2(message)}`;
}

export function createTelegramChannel(config: TelegramChannelConfig, workspace?: string): NotificationChannel {
  const { botToken, chatId, connectAttemptTimeoutMs } = config;
  const label = resolveWorkspaceLabel(workspace);

  return {
    type: 'telegram',
    async send({ title, message, context }) {
      setDefaultAutoSelectFamilyAttemptTimeout(connectAttemptTimeoutMs ?? DEFAULT_CONNECT_ATTEMPT_TIMEOUT_MS);

      const text = formatTelegramMessage(`${title} [${label}]`, message, context);
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2' }),
        });
      } catch {
        // Fire-and-forget: ignore network failures
      }
    },
  };
}
