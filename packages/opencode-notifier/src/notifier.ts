import type { ChannelEntry, NotifyFunction } from './types.js';

export interface Notifier {
  notify: NotifyFunction;
}

/**
 * Fans a notification out to every channel that has the event enabled.
 *
 * Deliveries are not awaited: OpenCode runs tool hooks inline, so waiting on a Telegram request
 * there would hold up the tool. One failing channel never affects the others.
 */
export function createNotifier(channelEntries: ChannelEntry[], icon: string): Notifier {
  return {
    notify({ eventKey, title, message, sound }, context) {
      for (const { channel, events } of channelEntries) {
        if (!events[eventKey].enabled) {
          continue;
        }
        try {
          const result = channel.send({ title, message, context, icon, sound });
          if (result instanceof Promise) {
            result.catch(() => {});
          }
        } catch {
          // Continue to next channel
        }
      }
    },
  };
}
