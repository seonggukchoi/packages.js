import type { NotificationChannel, TelegramChannelConfig } from '../types.js';

function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

export function formatTelegramMessage(title: string, message: string, context: string): string {
  return `*${escapeMarkdownV2(title)}*\n${escapeMarkdownV2(context)}: ${escapeMarkdownV2(message)}`;
}

export function createTelegramChannel(config: TelegramChannelConfig): NotificationChannel {
  const { botToken, chatId } = config;

  return {
    type: 'telegram',
    async send({ title, message, context }) {
      const text = formatTelegramMessage(title, message, context);
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
