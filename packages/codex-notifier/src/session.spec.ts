vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock-home'),
}));

import { readFileSync } from 'node:fs';

import { resolveSessionContext, resolveSessionName } from './session.js';

const mockedReadFileSync = vi.mocked(readFileSync);

const SESSION_INDEX_PATH = '/mock-home/.codex/session_index.jsonl';
const THREAD_ID = '01a07616-e220-7de1-814f-c9f303779368';
const OTHER_THREAD_ID = '01a08130-ffa0-7f21-8dcd-d85eae3ad2bb';

function sessionIndex(...lines: string[]): string {
  return `${lines.join('\n')}\n`;
}

function indexRecord(id: string, threadName: unknown): string {
  return JSON.stringify({ id, thread_name: threadName, updated_at: '2026-09-06T09:40:29.619527662Z' });
}

beforeEach(() => {
  delete process.env.CODEX_HOME;
});

afterEach(() => {
  delete process.env.CODEX_HOME;
});

describe('resolveSessionName', () => {
  it('resolves the thread name from the session index', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, 'My Thread')));

    const result = resolveSessionName({ session_id: THREAD_ID });

    expect(result).toBe('My Thread');
    expect(mockedReadFileSync).toHaveBeenCalledWith(SESSION_INDEX_PATH, 'utf-8');
  });

  it('reads the session index from CODEX_HOME when it is set', () => {
    process.env.CODEX_HOME = '/custom/codex-home';
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, 'My Thread')));

    const result = resolveSessionName({ session_id: THREAD_ID });

    expect(result).toBe('My Thread');
    expect(mockedReadFileSync).toHaveBeenCalledWith('/custom/codex-home/session_index.jsonl', 'utf-8');
  });

  it('uses the newest record when the thread was renamed', () => {
    mockedReadFileSync.mockReturnValueOnce(
      sessionIndex(indexRecord(THREAD_ID, 'Generated from first message'), indexRecord(THREAD_ID, 'Renamed')),
    );

    const result = resolveSessionName({ session_id: THREAD_ID });

    expect(result).toBe('Renamed');
  });

  it('ignores records that belong to other threads', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, 'Mine'), indexRecord(OTHER_THREAD_ID, 'Theirs')));

    const result = resolveSessionName({ session_id: THREAD_ID });

    expect(result).toBe('Mine');
  });

  it('trims the thread name', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, '  Spaced  ')));

    const result = resolveSessionName({ session_id: THREAD_ID });

    expect(result).toBe('Spaced');
  });

  it('treats a cleared name as unset instead of reviving an older name', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, 'Earlier'), indexRecord(THREAD_ID, '')));

    const result = resolveSessionName({ session_id: THREAD_ID });

    expect(result).toBeUndefined();
  });

  it('treats a non-string thread name as unset', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, 123)));

    const result = resolveSessionName({ session_id: THREAD_ID });

    expect(result).toBeUndefined();
  });

  it('skips malformed lines and keeps scanning', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, 'Recovered'), `{"id":"${THREAD_ID}","thread_name":`));

    const result = resolveSessionName({ session_id: THREAD_ID });

    expect(result).toBe('Recovered');
  });

  it('skips lines that mention the thread id but describe another thread', () => {
    const decoy = JSON.stringify({ id: OTHER_THREAD_ID, thread_name: `mentions ${THREAD_ID}` });
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, 'Real'), decoy));

    const result = resolveSessionName({ session_id: THREAD_ID });

    expect(result).toBe('Real');
  });

  it('returns undefined when the thread has no record', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(OTHER_THREAD_ID, 'Theirs')));

    const result = resolveSessionName({ session_id: THREAD_ID });

    expect(result).toBeUndefined();
  });

  it('returns undefined when the session index cannot be read', () => {
    mockedReadFileSync.mockImplementationOnce(() => {
      throw new Error('ENOENT');
    });

    const result = resolveSessionName({ session_id: THREAD_ID });

    expect(result).toBeUndefined();
  });

  it('returns undefined and skips the lookup when session_id is missing', () => {
    const result = resolveSessionName({});

    expect(result).toBeUndefined();
    expect(mockedReadFileSync).not.toHaveBeenCalled();
  });

  it('returns undefined and skips the lookup when session_id is not a string', () => {
    const result = resolveSessionName({ session_id: 42 as unknown as string });

    expect(result).toBeUndefined();
    expect(mockedReadFileSync).not.toHaveBeenCalled();
  });
});

describe('resolveSessionContext', () => {
  it('returns the session name unchanged for non-subagent events', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, 'Main')));

    const result = resolveSessionContext('sessionCompleted', { session_id: THREAD_ID }, 'fallback');

    expect(result).toBe('Main');
  });

  it('appends the agent_type for subagentCompleted events', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, 'Main')));

    const result = resolveSessionContext(
      'subagentCompleted',
      { session_id: THREAD_ID, agent_id: OTHER_THREAD_ID, agent_type: 'explorer' },
      'fallback',
    );

    expect(result).toBe('Main(explorer)');
  });

  it('appends the agent_type for subagentStarted events', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, 'Main')));

    const result = resolveSessionContext(
      'subagentStarted',
      { session_id: THREAD_ID, agent_id: OTHER_THREAD_ID, agent_type: 'worker' },
      'fallback',
    );

    expect(result).toBe('Main(worker)');
  });

  it('trims the agent_type before appending it', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, 'Main')));

    const result = resolveSessionContext('subagentCompleted', { session_id: THREAD_ID, agent_type: '  explorer  ' }, 'fallback');

    expect(result).toBe('Main(explorer)');
  });

  it('omits the suffix on a subagent event when agent_type is missing', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, 'Main')));

    const result = resolveSessionContext('subagentCompleted', { session_id: THREAD_ID }, 'fallback');

    expect(result).toBe('Main');
  });

  it('omits the suffix on a subagent event when agent_type is blank', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, 'Main')));

    const result = resolveSessionContext('subagentCompleted', { session_id: THREAD_ID, agent_type: '   ' }, 'fallback');

    expect(result).toBe('Main');
  });

  it('uses the fallback name when the session name cannot be resolved', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex());

    const result = resolveSessionContext('subagentCompleted', { session_id: THREAD_ID, agent_type: 'explorer' }, 'my-project');

    expect(result).toBe('my-project(explorer)');
  });

  it('resolves the main session name on a subagent event because session_id is the root thread id', () => {
    mockedReadFileSync.mockReturnValueOnce(sessionIndex(indexRecord(THREAD_ID, 'Main Project'), indexRecord(OTHER_THREAD_ID, 'Child')));

    const result = resolveSessionContext(
      'subagentCompleted',
      { session_id: THREAD_ID, agent_id: OTHER_THREAD_ID, agent_type: 'explorer' },
      'fallback',
    );

    expect(result).toBe('Main Project(explorer)');
  });
});
