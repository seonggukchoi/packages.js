vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';

import { createMacOSChannel } from './macos.js';

const mockedSpawn = vi.mocked(spawn);

describe('createMacOSChannel', () => {
  it('returns a channel with type macos', () => {
    const channel = createMacOSChannel('/path/icon.png');

    expect(channel.type).toBe('macos');
  });

  it('spawns terminal-notifier with correct arguments', () => {
    const unrefMock = vi.fn();
    mockedSpawn.mockReturnValue({ unref: unrefMock, on: vi.fn() } as never);

    const channel = createMacOSChannel('');
    channel.send({ title: 'Test Title', message: 'Test message', context: 'my-project', sound: 'Pop' });

    expect(mockedSpawn).toHaveBeenCalledWith(
      'terminal-notifier',
      ['-title', '"Test Title"', '-message', '"my-project: Test message"', '-sound', '"Pop"'],
      { detached: true, stdio: 'ignore' },
    );
    expect(unrefMock).toHaveBeenCalled();
  });

  it('prefixes the message with the context given to each send', () => {
    const unrefMock = vi.fn();
    mockedSpawn.mockReturnValue({ unref: unrefMock, on: vi.fn() } as never);

    const channel = createMacOSChannel('');
    channel.send({ title: 'Title', message: 'First', context: 'session-a' });
    channel.send({ title: 'Title', message: 'Second', context: 'session-b(explore)' });

    expect(mockedSpawn.mock.calls[0]![1]).toContain('"session-a: First"');
    expect(mockedSpawn.mock.calls[1]![1]).toContain('"session-b(explore): Second"');
  });

  it('adds contentImage when icon is provided', () => {
    const unrefMock = vi.fn();
    mockedSpawn.mockReturnValue({ unref: unrefMock, on: vi.fn() } as never);

    const channel = createMacOSChannel('/path/to/icon.png');
    channel.send({ title: 'Title', message: 'Message', context: 'ctx' });

    const args = mockedSpawn.mock.calls[0]![1] as string[];
    expect(args).toContain('-contentImage');
    expect(args).toContain('"/path/to/icon.png"');
  });

  it('does not add contentImage when icon is empty string', () => {
    const unrefMock = vi.fn();
    mockedSpawn.mockReturnValue({ unref: unrefMock, on: vi.fn() } as never);

    const channel = createMacOSChannel('');
    channel.send({ title: 'Title', message: 'Message', context: 'ctx' });

    const args = mockedSpawn.mock.calls[0]![1] as string[];
    expect(args).not.toContain('-contentImage');
  });

  it('uses default sound when not specified', () => {
    const unrefMock = vi.fn();
    mockedSpawn.mockReturnValue({ unref: unrefMock, on: vi.fn() } as never);

    const channel = createMacOSChannel('');
    channel.send({ title: 'Title', message: 'Message', context: 'ctx' });

    const args = mockedSpawn.mock.calls[0]![1] as string[];
    expect(args).toContain('-sound');
    expect(args).toContain('"default"');
  });

  it('handles spawn error gracefully without throwing', () => {
    mockedSpawn.mockImplementation(() => {
      throw new Error('spawn failed');
    });

    const channel = createMacOSChannel('');

    expect(() => {
      channel.send({ title: 'Title', message: 'Message', context: 'ctx' });
    }).not.toThrow();
  });

  it('handles async spawn error event gracefully without crashing', () => {
    const onMock = vi.fn();
    const unrefMock = vi.fn();
    mockedSpawn.mockReturnValue({ unref: unrefMock, on: onMock } as never);

    const channel = createMacOSChannel('');
    channel.send({ title: 'Title', message: 'Message', context: 'ctx' });

    expect(onMock).toHaveBeenCalledWith('error', expect.any(Function));

    const errorHandler = onMock.mock.calls[0]![1] as () => void;
    expect(() => errorHandler()).not.toThrow();
  });
});
