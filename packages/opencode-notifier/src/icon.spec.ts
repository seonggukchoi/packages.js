vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock-home'),
}));

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

import { ensureIconCache, getPngIcon } from './icon.js';

const mockedExecSync = vi.mocked(execSync);
const mockedExistsSync = vi.mocked(existsSync);
const mockedMkdirSync = vi.mocked(mkdirSync);

describe('ensureIconCache', () => {
  it('creates cache directory if it does not exist', () => {
    mockedExistsSync.mockReturnValue(false);

    ensureIconCache();

    expect(mockedMkdirSync).toHaveBeenCalledWith('/mock-home/.cache/opencode/icons', { recursive: true });
  });

  it('skips existing png files', () => {
    mockedExistsSync.mockReturnValue(true);

    ensureIconCache();

    expect(mockedExecSync).not.toHaveBeenCalled();
  });

  it('skips if icns file does not exist', () => {
    // First call: cache dir exists
    // Then for each app: png doesn't exist, icns doesn't exist
    mockedExistsSync.mockImplementation((path: unknown) => {
      const pathStr = path as string;
      if (pathStr === '/mock-home/.cache/opencode/icons') {
        return true;
      }
      // png files don't exist
      if (pathStr.endsWith('.png')) {
        return false;
      }
      // icns files don't exist
      if (pathStr.endsWith('.icns')) {
        return false;
      }
      return false;
    });

    ensureIconCache();

    expect(mockedExecSync).not.toHaveBeenCalled();
  });

  it('handles sips execution error', () => {
    mockedExistsSync.mockImplementation((path: unknown) => {
      const pathStr = path as string;
      if (pathStr === '/mock-home/.cache/opencode/icons') {
        return true;
      }
      // png files don't exist
      if (pathStr.endsWith('.png')) {
        return false;
      }
      // icns files exist
      if (pathStr.endsWith('.icns')) {
        return true;
      }
      return false;
    });
    mockedExecSync.mockImplementation(() => {
      throw new Error('sips failed');
    });

    expect(() => {
      ensureIconCache();
    }).not.toThrow();
  });
});

describe('getPngIcon', () => {
  it('returns path when file exists', () => {
    mockedExistsSync.mockReturnValue(true);

    const result = getPngIcon('iTerm2');

    expect(result).toBe('/mock-home/.cache/opencode/icons/iTerm2.png');
  });

  it('returns empty string when file does not exist', () => {
    mockedExistsSync.mockReturnValue(false);

    const result = getPngIcon('iTerm2');

    expect(result).toBe('');
  });
});
