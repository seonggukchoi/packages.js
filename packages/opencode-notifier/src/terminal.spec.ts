vi.mock('./icon.js', () => ({
  getPngIcon: vi.fn(),
}));

import { getPngIcon } from './icon.js';
import { detectTerminal } from './terminal.js';

const mockedGetPngIcon = vi.mocked(getPngIcon);

describe('detectTerminal', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TERM_PROGRAM;
    delete process.env.ITERM_SESSION_ID;
    delete process.env.CURSOR_EDITOR;
    delete process.env.VSCODE_GIT_IPC_HANDLE;
    delete process.env.ZED_TERM;
    mockedGetPngIcon.mockReturnValue('');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('detects iTerm2 from ITERM_SESSION_ID', () => {
    process.env.ITERM_SESSION_ID = 'some-session-id';

    const result = detectTerminal('/projects/my-app');

    expect(result.app).toBe('iTerm2');
    expect(mockedGetPngIcon).toHaveBeenCalledWith('iTerm2');
  });

  it('detects Cursor from CURSOR_EDITOR', () => {
    process.env.CURSOR_EDITOR = '/path/to/cursor';

    const result = detectTerminal('/projects/my-app');

    expect(result.app).toBe('Cursor');
    expect(mockedGetPngIcon).toHaveBeenCalledWith('Cursor');
  });

  it('detects Cursor from TERM_PROGRAM containing cursor', () => {
    process.env.TERM_PROGRAM = 'cursor-terminal';

    const result = detectTerminal('/projects/my-app');

    expect(result.app).toBe('Cursor');
  });

  it('detects VS Code from TERM_PROGRAM === vscode', () => {
    process.env.TERM_PROGRAM = 'vscode';

    const result = detectTerminal('/projects/my-app');

    expect(result.app).toBe('VS Code');
    expect(mockedGetPngIcon).toHaveBeenCalledWith('VS Code');
  });

  it('detects VS Code from VSCODE_GIT_IPC_HANDLE without TERM_PROGRAM', () => {
    process.env.VSCODE_GIT_IPC_HANDLE = '/tmp/vscode-ipc';

    const result = detectTerminal('/projects/my-app');

    expect(result.app).toBe('Cursor');
  });

  it('detects Terminal.app from TERM_PROGRAM === Apple_Terminal', () => {
    process.env.TERM_PROGRAM = 'Apple_Terminal';

    const result = detectTerminal('/projects/my-app');

    expect(result.app).toBe('Terminal.app');
  });

  it('detects Warp from TERM_PROGRAM === WarpTerminal', () => {
    process.env.TERM_PROGRAM = 'WarpTerminal';

    const result = detectTerminal('/projects/my-app');

    expect(result.app).toBe('Warp');
  });

  it('detects Hyper from TERM_PROGRAM === Hyper', () => {
    process.env.TERM_PROGRAM = 'Hyper';

    const result = detectTerminal('/projects/my-app');

    expect(result.app).toBe('Hyper');
  });

  it('detects Zed from ZED_TERM', () => {
    process.env.ZED_TERM = '1';

    const result = detectTerminal('/projects/my-app');

    expect(result.app).toBe('Zed');
    expect(mockedGetPngIcon).toHaveBeenCalledWith('Zed');
  });

  it('detects Zed from TERM_PROGRAM === zed', () => {
    process.env.TERM_PROGRAM = 'zed';

    const result = detectTerminal('/projects/my-app');

    expect(result.app).toBe('Zed');
  });

  it('falls back to Terminal.app when no env vars set', () => {
    const result = detectTerminal('/projects/my-app');

    expect(result.app).toBe('Terminal.app');
  });

  it('extracts project name from directory path', () => {
    const result = detectTerminal('/home/user/projects/awesome-project');

    expect(result.projectName).toBe('awesome-project');
  });

  it('uses cwd when directory is empty', () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/fallback/cwd-project');

    const result = detectTerminal('');

    expect(result.projectName).toBe('cwd-project');
    cwdSpy.mockRestore();
  });

  it('uses full path as project name when path ends with slash', () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/fallback/');

    const result = detectTerminal('');

    expect(result.projectName).toBe('/fallback/');
    cwdSpy.mockRestore();
  });
});
