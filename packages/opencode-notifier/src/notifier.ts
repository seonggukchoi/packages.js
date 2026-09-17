import type { ChannelEntry, NotifyFunction } from './types.js';

export interface Notifier {
  notify: NotifyFunction;
  /** Resolves once every delivery started so far has settled. */
  flush(): Promise<void>;
}

/**
 * Fans a notification out to every channel that has the event enabled.
 *
 * Deliveries are not awaited by the caller: OpenCode runs tool hooks inline, so waiting on a
 * Telegram request there would hold up the tool. They are tracked instead so `flush` can wait for
 * them when the plugin is disposed, which is the only point at which OpenCode still waits for the
 * plugin before the process exits. One failing channel never affects the others.
 */
export function createNotifier(channelEntries: ChannelEntry[], icon: string): Notifier {
  const pending = new Set<Promise<void>>();

  return {
    notify({ eventKey, title, message, sound }, context) {
      for (const { channel, events } of channelEntries) {
        if (!events[eventKey].enabled) {
          continue;
        }
        try {
          const result = channel.send({ title, message, context, icon, sound });
          if (result instanceof Promise) {
            const tracked: Promise<void> = result.catch(() => {}).finally(() => pending.delete(tracked));
            pending.add(tracked);
          }
        } catch {
          // Continue to next channel
        }
      }
    },

    async flush() {
      await Promise.allSettled([...pending]);
    },
  };
}
