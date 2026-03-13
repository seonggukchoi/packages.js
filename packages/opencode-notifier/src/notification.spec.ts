vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';

import { sendNotification } from './notification.js';

const mockedSpawn = vi.mocked(spawn);

describe('sendNotification', () => {
  it('spawns terminal-notifier with correct arguments', () => {
    const unrefMock = vi.fn();
    mockedSpawn.mockReturnValue({ unref: unrefMock } as never);

    sendNotification('my-project', '', 'Test Title', 'Test message', 'Pop');

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

    sendNotification('my-project', '/path/to/icon.png', 'Title', 'Message');

    const args = mockedSpawn.mock.calls[0]![1] as string[];
    expect(args).toContain('-contentImage');
    expect(args).toContain('"/path/to/icon.png"');
  });

  it('does not add contentImage when icon is empty string', () => {
    const unrefMock = vi.fn();
    mockedSpawn.mockReturnValue({ unref: unrefMock } as never);

    sendNotification('my-project', '', 'Title', 'Message');

    const args = mockedSpawn.mock.calls[0]![1] as string[];
    expect(args).not.toContain('-contentImage');
  });

  it('uses default sound when not specified', () => {
    const unrefMock = vi.fn();
    mockedSpawn.mockReturnValue({ unref: unrefMock } as never);

    sendNotification('my-project', '', 'Title', 'Message');

    const args = mockedSpawn.mock.calls[0]![1] as string[];
    expect(args).toContain('-sound');
    expect(args).toContain('"default"');
  });

  it('handles spawn error gracefully without throwing', () => {
    mockedSpawn.mockImplementation(() => {
      throw new Error('spawn failed');
    });

    expect(() => {
      sendNotification('my-project', '', 'Title', 'Message');
    }).not.toThrow();
  });
});
