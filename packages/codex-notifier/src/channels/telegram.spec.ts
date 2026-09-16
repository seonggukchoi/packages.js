import { getDefaultAutoSelectFamilyAttemptTimeout, setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';
import { hostname } from 'node:os';

import { DEFAULT_CONNECT_ATTEMPT_TIMEOUT_MS, createTelegramChannel, formatTelegramMessage, resolveWorkspaceLabel } from './telegram.js';

import type { TelegramChannelConfig } from '../types.js';

describe('formatTelegramMessage', () => {
  it('formats title, message, and context with MarkdownV2 escaping', () => {
    const result = formatTelegramMessage('Title', 'Hello world', 'my-project');

    expect(result).toBe('*Title*\nmy\\-project: Hello world');
  });

  it('escapes special MarkdownV2 characters', () => {
    const result = formatTelegramMessage('Test_Title', 'msg (1)', 'ctx');

    expect(result).toBe('*Test\\_Title*\nctx: msg \\(1\\)');
  });

  it('handles empty strings', () => {
    const result = formatTelegramMessage('', '', '');

    expect(result).toBe('**\n: ');
  });
});

describe('resolveWorkspaceLabel', () => {
  it('returns the provided workspace label', () => {
    expect(resolveWorkspaceLabel('home-workspace')).toBe('home-workspace');
  });

  it('trims surrounding whitespace from the label', () => {
    expect(resolveWorkspaceLabel('  home-workspace  ')).toBe('home-workspace');
  });

  it('falls back to the OS hostname when the workspace is undefined', () => {
    expect(resolveWorkspaceLabel()).toBe(hostname());
  });

  it('falls back to the OS hostname when the workspace is blank', () => {
    expect(resolveWorkspaceLabel('   ')).toBe(hostname());
  });
});

describe('createTelegramChannel', () => {
  const baseConfig: TelegramChannelConfig = {
    enabled: true,
    botToken: 'test-token-123',
    chatId: '987654',
  };

  it('returns a channel with type telegram', () => {
    const channel = createTelegramChannel(baseConfig);

    expect(channel.type).toBe('telegram');
  });

  it('sends a POST request to Telegram Bot API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const channel = createTelegramChannel(baseConfig, 'home-workspace');
    await channel.send({ title: 'Test', message: 'Hello', context: 'project' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('https://api.telegram.org/bottest-token-123/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: '987654',
        text: formatTelegramMessage('Test [home-workspace]', 'Hello', 'project'),
        parse_mode: 'MarkdownV2',
      }),
    });

    vi.unstubAllGlobals();
  });

  it('uses MarkdownV2 escaped text in request body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const channel = createTelegramChannel(baseConfig, 'home-workspace');
    await channel.send({ title: 'My_Title', message: 'test (1)', context: 'my-project' });

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body as string) as { text: string };
    expect(body.text).toBe(formatTelegramMessage('My_Title [home-workspace]', 'test (1)', 'my-project'));

    vi.unstubAllGlobals();
  });

  it('handles fetch error gracefully without throwing', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
    vi.stubGlobal('fetch', mockFetch);

    const channel = createTelegramChannel(baseConfig);

    await expect(channel.send({ title: 'T', message: 'M', context: 'C' })).resolves.toBeUndefined();

    vi.unstubAllGlobals();
  });

  it('does not throw when fetch returns non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal('fetch', mockFetch);

    const channel = createTelegramChannel(baseConfig);

    await expect(channel.send({ title: 'T', message: 'M', context: 'C' })).resolves.toBeUndefined();

    vi.unstubAllGlobals();
  });

  it('appends the configured workspace label to the title', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const channel = createTelegramChannel(baseConfig, 'home-workspace');
    await channel.send({ title: '⚡ Codex', message: 'Session started.', context: 'project' });

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body as string) as { text: string };
    expect(body.text).toBe(formatTelegramMessage('⚡ Codex [home-workspace]', 'Session started.', 'project'));

    vi.unstubAllGlobals();
  });

  it('falls back to the OS hostname in the title when no workspace is configured', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const channel = createTelegramChannel(baseConfig);
    await channel.send({ title: '⚡ Codex', message: 'Session started.', context: 'project' });

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body as string) as { text: string };
    expect(body.text).toBe(formatTelegramMessage(`⚡ Codex [${hostname()}]`, 'Session started.', 'project'));

    vi.unstubAllGlobals();
  });
});

describe('connection attempt timeout', () => {
  const nodeDefaultTimeout = getDefaultAutoSelectFamilyAttemptTimeout();

  const baseConfig: TelegramChannelConfig = {
    enabled: true,
    botToken: 'test-token-123',
    chatId: '987654',
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    setDefaultAutoSelectFamilyAttemptTimeout(nodeDefaultTimeout);
    vi.unstubAllGlobals();
  });

  it('raises the attempt timeout to the channel default when none is configured', async () => {
    const channel = createTelegramChannel(baseConfig);

    await channel.send({ title: 'T', message: 'M', context: 'C' });

    expect(getDefaultAutoSelectFamilyAttemptTimeout()).toBe(DEFAULT_CONNECT_ATTEMPT_TIMEOUT_MS);
  });

  it('applies the configured attempt timeout instead of the channel default', async () => {
    const channel = createTelegramChannel({ ...baseConfig, connectAttemptTimeoutMs: 5000 });

    await channel.send({ title: 'T', message: 'M', context: 'C' });

    expect(getDefaultAutoSelectFamilyAttemptTimeout()).toBe(5000);
  });

  it('keeps the channel default higher than the Node default it replaces', () => {
    expect(DEFAULT_CONNECT_ATTEMPT_TIMEOUT_MS).toBeGreaterThan(nodeDefaultTimeout);
  });
});
