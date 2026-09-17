import { createNotifier } from './notifier.js';

import type { ChannelEntry, EventKey, EventOptions, NotificationData } from './types.js';

function buildEvents(overrides: Partial<Record<EventKey, EventOptions>> = {}): Record<EventKey, EventOptions> {
  return {
    sessionStarted: { enabled: true },
    sessionCompleted: { enabled: true },
    sessionError: { enabled: true },
    sessionCompacted: { enabled: true },
    permissionRequested: { enabled: true },
    decisionNeeded: { enabled: true },
    subagentStarted: { enabled: true },
    subagentCompleted: { enabled: true },
    toolExecuting: { enabled: true },
    toolCompleted: { enabled: true },
    ...overrides,
  };
}

const notification: NotificationData = {
  eventKey: 'sessionCompleted',
  title: '✅ OpenCode',
  message: 'Session completed.',
  sound: 'Hero',
};

describe('createNotifier', () => {
  it('sends to every channel with the event enabled, passing context and icon', () => {
    const macosSend = vi.fn();
    const telegramSend = vi.fn().mockResolvedValue(undefined);
    const entries: ChannelEntry[] = [
      { channel: { type: 'macos', send: macosSend }, events: buildEvents() },
      { channel: { type: 'telegram', send: telegramSend }, events: buildEvents() },
    ];

    createNotifier(entries, '/icon.png').notify(notification, 'my-project');

    const expected = {
      title: '✅ OpenCode',
      message: 'Session completed.',
      context: 'my-project',
      icon: '/icon.png',
      sound: 'Hero',
    };
    expect(macosSend).toHaveBeenCalledWith(expected);
    expect(telegramSend).toHaveBeenCalledWith(expected);
  });

  it('skips channels that have the event disabled', () => {
    const macosSend = vi.fn();
    const telegramSend = vi.fn();
    const entries: ChannelEntry[] = [
      { channel: { type: 'macos', send: macosSend }, events: buildEvents({ sessionCompleted: { enabled: false } }) },
      { channel: { type: 'telegram', send: telegramSend }, events: buildEvents() },
    ];

    createNotifier(entries, '').notify(notification, 'ctx');

    expect(macosSend).not.toHaveBeenCalled();
    expect(telegramSend).toHaveBeenCalledTimes(1);
  });

  it('continues with the next channel when one throws synchronously', () => {
    const failingSend = vi.fn(() => {
      throw new Error('boom');
    });
    const telegramSend = vi.fn();
    const entries: ChannelEntry[] = [
      { channel: { type: 'macos', send: failingSend }, events: buildEvents() },
      { channel: { type: 'telegram', send: telegramSend }, events: buildEvents() },
    ];

    expect(() => createNotifier(entries, '').notify(notification, 'ctx')).not.toThrow();
    expect(telegramSend).toHaveBeenCalledTimes(1);
  });

  it('absorbs a rejected delivery without an unhandled rejection', async () => {
    const entries: ChannelEntry[] = [
      { channel: { type: 'telegram', send: vi.fn().mockRejectedValue(new Error('network')) }, events: buildEvents() },
    ];
    const notifier = createNotifier(entries, '');

    notifier.notify(notification, 'ctx');

    await expect(notifier.flush()).resolves.toBeUndefined();
  });

  it('flush waits for deliveries that are still in flight', async () => {
    let finish!: () => void;
    const delivery = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const entries: ChannelEntry[] = [{ channel: { type: 'telegram', send: vi.fn(() => delivery) }, events: buildEvents() }];
    const notifier = createNotifier(entries, '');

    notifier.notify(notification, 'ctx');

    let flushed = false;
    const flushing = notifier.flush().then(() => {
      flushed = true;
    });
    await Promise.resolve();
    expect(flushed).toBe(false);

    finish();
    await flushing;
    expect(flushed).toBe(true);
  });

  it('flush resolves immediately when nothing is pending', async () => {
    const notifier = createNotifier([], '');

    await expect(notifier.flush()).resolves.toBeUndefined();
  });

  it('drops settled deliveries so flush does not wait on them again', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const entries: ChannelEntry[] = [{ channel: { type: 'telegram', send }, events: buildEvents() }];
    const notifier = createNotifier(entries, '');

    notifier.notify(notification, 'ctx');
    await notifier.flush();

    const allSettled = vi.spyOn(Promise, 'allSettled');
    await notifier.flush();

    expect(allSettled).toHaveBeenCalledWith([]);
    allSettled.mockRestore();
  });
});
