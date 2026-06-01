vi.mock('node:fs', () => ({
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock-home'),
}));

import { readdirSync, readFileSync } from 'node:fs';

import { resolveSessionName } from './session.js';

const mockedReaddirSync = vi.mocked(readdirSync);
const mockedReadFileSync = vi.mocked(readFileSync);

function sessionFile(record: Record<string, unknown>): string {
  return JSON.stringify(record);
}

describe('resolveSessionName', () => {
  it('uses session_title from the hook payload without touching the registry', () => {
    const result = resolveSessionName({ session_id: 'sid-1', session_title: 'My Session' });

    expect(result).toBe('My Session');
    expect(mockedReaddirSync).not.toHaveBeenCalled();
  });

  it('trims the inline session_title', () => {
    const result = resolveSessionName({ session_id: 'sid-1', session_title: '  Spaced Name  ' });

    expect(result).toBe('Spaced Name');
  });

  it('falls back to the registry when session_title is blank', () => {
    mockedReaddirSync.mockReturnValue([] as never);

    const result = resolveSessionName({ session_id: 'sid-1', session_title: '   ' });

    expect(result).toBeUndefined();
  });

  it('ignores an inline session_title that is the session id prefix', () => {
    mockedReaddirSync.mockReturnValue([] as never);

    const result = resolveSessionName({ session_id: '077dcc04-1d22-4b4e', session_title: '077dcc04' });

    expect(result).toBeUndefined();
  });

  it('reads the name from the matching registry record when session_title is absent', () => {
    mockedReaddirSync.mockReturnValue(['250120.json'] as never);
    mockedReadFileSync.mockReturnValueOnce(sessionFile({ sessionId: 'sid-1', name: 'packages.js' }));

    const result = resolveSessionName({ session_id: 'sid-1' });

    expect(result).toBe('packages.js');
  });

  it('skips non-json files in the sessions directory', () => {
    mockedReaddirSync.mockReturnValue(['notes.txt', 'sid.json'] as never);
    mockedReadFileSync.mockReturnValueOnce(sessionFile({ sessionId: 'sid-1', name: 'Matched' }));

    const result = resolveSessionName({ session_id: 'sid-1' });

    expect(result).toBe('Matched');
    expect(mockedReadFileSync).toHaveBeenCalledTimes(1);
  });

  it('skips records whose sessionId does not match', () => {
    mockedReaddirSync.mockReturnValue(['a.json', 'b.json'] as never);
    mockedReadFileSync
      .mockReturnValueOnce(sessionFile({ sessionId: 'other', name: 'Other' }))
      .mockReturnValueOnce(sessionFile({ sessionId: 'sid-1', name: 'Matched' }));

    const result = resolveSessionName({ session_id: 'sid-1' });

    expect(result).toBe('Matched');
  });

  it('ignores malformed session files and keeps scanning', () => {
    mockedReaddirSync.mockReturnValue(['bad.json', 'good.json'] as never);
    mockedReadFileSync.mockReturnValueOnce('{ not valid json').mockReturnValueOnce(sessionFile({ sessionId: 'sid-1', name: 'Recovered' }));

    const result = resolveSessionName({ session_id: 'sid-1' });

    expect(result).toBe('Recovered');
  });

  it('returns undefined when no registry record matches', () => {
    mockedReaddirSync.mockReturnValue(['a.json'] as never);
    mockedReadFileSync.mockReturnValueOnce(sessionFile({ sessionId: 'other', name: 'Other' }));

    const result = resolveSessionName({ session_id: 'sid-1' });

    expect(result).toBeUndefined();
  });

  it('returns undefined when the sessions directory cannot be read', () => {
    mockedReaddirSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const result = resolveSessionName({ session_id: 'sid-1' });

    expect(result).toBeUndefined();
  });

  it('ignores a registry name that is the session id prefix', () => {
    mockedReaddirSync.mockReturnValue(['x.json'] as never);
    mockedReadFileSync.mockReturnValueOnce(sessionFile({ sessionId: '077dcc04-1d22-4b4e', name: '077dcc04' }));

    const result = resolveSessionName({ session_id: '077dcc04-1d22-4b4e' });

    expect(result).toBeUndefined();
  });

  it('ignores a registry record with a non-string name', () => {
    mockedReaddirSync.mockReturnValue(['x.json'] as never);
    mockedReadFileSync.mockReturnValueOnce(sessionFile({ sessionId: 'sid-1', name: 123 }));

    const result = resolveSessionName({ session_id: 'sid-1' });

    expect(result).toBeUndefined();
  });

  it('ignores a registry record with a blank name', () => {
    mockedReaddirSync.mockReturnValue(['x.json'] as never);
    mockedReadFileSync.mockReturnValueOnce(sessionFile({ sessionId: 'sid-1', name: '   ' }));

    const result = resolveSessionName({ session_id: 'sid-1' });

    expect(result).toBeUndefined();
  });

  it('returns undefined and skips the registry when session_id is missing', () => {
    const result = resolveSessionName({});

    expect(result).toBeUndefined();
    expect(mockedReaddirSync).not.toHaveBeenCalled();
  });
});
