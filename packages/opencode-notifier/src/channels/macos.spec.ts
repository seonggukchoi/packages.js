vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';

import { createMacOSChannel } from './macos.js';

const mockedSpawn = vi.mocked(spawn);

describe('createMacOSChannel', () => {
  it('returns a channel with type macos', () => {
    const channel = createMacOSChannel('my-project', '/path/icon.png');

    expect(channel.type).toBe('macos');
  });

  it('spawns terminal-notifier with correct arguments', () => {
    const unrefMock = vi.fn();
    mockedSpawn.mockReturnValue({ unref: unrefMock } as never);

    const channel = createMacOSChannel('my-project', '');
    channel.send({ title: 'Test Title', message: 'Test message', context: 'ctx', sound: 'Pop' });

    expect(mockedSpawn).toHaveBeenCalledWith(
      'terminal-notifier',
      ['-title', '"Test Title"', '-message', '"my-project: Test message"', '-sound', '"Pop"'],
      { detached: true, stdio: 'ignore' },
    );
    expect(unrefMock).toHaveBeenCalled();
  });

  it('adds contentImage when icon is provided', () => {
    const unrefMock = vi.fn();
    mockedSpawn.mockReturnValue({ unref: unrefMock } as never);

    const channel = createMacOSChannel('my-project', '/path/to/icon.png');
    channel.send({ title: 'Title', message: 'Message', context: 'ctx' });

    const args = mockedSpawn.mock.calls[0]![1] as string[];
    expect(args).toContain('-contentImage');
    expect(args).toContain('"/path/to/icon.png"');
  });

  it('does not add contentImage when icon is empty string', () => {
    const unrefMock = vi.fn();
    mockedSpawn.mockReturnValue({ unref: unrefMock } as never);

    const channel = createMacOSChannel('my-project', '');
    channel.send({ title: 'Title', message: 'Message', context: 'ctx' });

    const args = mockedSpawn.mock.calls[0]![1] as string[];
    expect(args).not.toContain('-contentImage');
  });

  it('uses default sound when not specified', () => {
    const unrefMock = vi.fn();
    mockedSpawn.mockReturnValue({ unref: unrefMock } as never);

    const channel = createMacOSChannel('my-project', '');
    channel.send({ title: 'Title', message: 'Message', context: 'ctx' });

    const args = mockedSpawn.mock.calls[0]![1] as string[];
    expect(args).toContain('-sound');
    expect(args).toContain('"default"');
  });

  it('handles spawn error gracefully without throwing', () => {
    mockedSpawn.mockImplementation(() => {
      throw new Error('spawn failed');
    });

    const channel = createMacOSChannel('my-project', '');

    expect(() => {
      channel.send({ title: 'Title', message: 'Message', context: 'ctx' });
    }).not.toThrow();
  });
});
