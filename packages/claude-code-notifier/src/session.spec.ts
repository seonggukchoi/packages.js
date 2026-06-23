vi.mock('node:fs', () => ({
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock-home'),
}));

import { readdirSync, readFileSync } from 'node:fs';

import { resolveSessionContext, resolveSessionName } from './session.js';

const mockedReaddirSync = vi.mocked(readdirSync);
const mockedReadFileSync = vi.mocked(readFileSync);

const TRANSCRIPT_PATH = '/mock-home/.claude/projects/project/sid-1.jsonl';

function sessionFile(record: Record<string, unknown>): string {
  return JSON.stringify(record);
}

function transcript(...lines: string[]): string {
  return `${lines.join('\n')}\n`;
}

function titleRecord(customTitle: unknown): string {
  return JSON.stringify({ type: 'custom-title', customTitle, sessionId: 'sid-1' });
}

describe('resolveSessionName', () => {
  describe('inline session_title', () => {
    it('uses session_title from the hook payload without touching the filesystem', () => {
      const result = resolveSessionName({ session_id: 'sid-1', session_title: 'My Session' });

      expect(result).toBe('My Session');
      expect(mockedReadFileSync).not.toHaveBeenCalled();
      expect(mockedReaddirSync).not.toHaveBeenCalled();
    });

    it('trims the inline session_title', () => {
      const result = resolveSessionName({ session_id: 'sid-1', session_title: '  Spaced Name  ' });

      expect(result).toBe('Spaced Name');
    });

    it('prefers the inline session_title over the transcript', () => {
      const result = resolveSessionName({ session_id: 'sid-1', session_title: 'Inline', transcript_path: TRANSCRIPT_PATH });

      expect(result).toBe('Inline');
      expect(mockedReadFileSync).not.toHaveBeenCalled();
    });

    it('ignores an inline session_title that is the session id prefix', () => {
      mockedReaddirSync.mockReturnValue([] as never);

      const result = resolveSessionName({ session_id: '077dcc04-1d22-4b4e', session_title: '077dcc04' });

      expect(result).toBeUndefined();
    });
  });

  describe('transcript lookup', () => {
    it('resolves the custom title from the transcript without touching the registry', () => {
      mockedReadFileSync.mockReturnValueOnce(transcript('{"type":"user","message":"hello"}', titleRecord('My Project')));

      const result = resolveSessionName({ session_id: 'sid-1', transcript_path: TRANSCRIPT_PATH });

      expect(result).toBe('My Project');
      expect(mockedReadFileSync).toHaveBeenCalledWith(TRANSCRIPT_PATH, 'utf-8');
      expect(mockedReaddirSync).not.toHaveBeenCalled();
    });

    it('uses the most recent custom-title record when the session was renamed multiple times', () => {
      mockedReadFileSync.mockReturnValueOnce(transcript(titleRecord('Old Name'), titleRecord('New Name')));

      const result = resolveSessionName({ session_id: 'sid-1', transcript_path: TRANSCRIPT_PATH });

      expect(result).toBe('New Name');
    });

    it('trims the custom title from the transcript', () => {
      mockedReadFileSync.mockReturnValueOnce(transcript(titleRecord('  Spaced  ')));

      const result = resolveSessionName({ session_id: 'sid-1', transcript_path: TRANSCRIPT_PATH });

      expect(result).toBe('Spaced');
    });

    it('ignores lines that mention custom-title but are not custom-title records', () => {
      mockedReadFileSync.mockReturnValueOnce(transcript(titleRecord('Real'), '{"type":"summary","custom-title":"decoy"}'));

      const result = resolveSessionName({ session_id: 'sid-1', transcript_path: TRANSCRIPT_PATH });

      expect(result).toBe('Real');
    });

    it('skips malformed transcript lines and keeps scanning', () => {
      mockedReadFileSync.mockReturnValueOnce(transcript(titleRecord('Recovered'), '{"type":"custom-title","customTitle":'));

      const result = resolveSessionName({ session_id: 'sid-1', transcript_path: TRANSCRIPT_PATH });

      expect(result).toBe('Recovered');
    });

    it('skips a blank custom title in favor of an earlier one', () => {
      mockedReadFileSync.mockReturnValueOnce(transcript(titleRecord('Earlier'), titleRecord('   ')));

      const result = resolveSessionName({ session_id: 'sid-1', transcript_path: TRANSCRIPT_PATH });

      expect(result).toBe('Earlier');
    });

    it('skips a non-string custom title', () => {
      mockedReadFileSync.mockReturnValueOnce(transcript(titleRecord('Earlier'), titleRecord(123)));

      const result = resolveSessionName({ session_id: 'sid-1', transcript_path: TRANSCRIPT_PATH });

      expect(result).toBe('Earlier');
    });

    it('falls back to the registry when the transcript title is the session id prefix', () => {
      mockedReadFileSync
        .mockReturnValueOnce(transcript(titleRecord('sid-1')))
        .mockReturnValueOnce(sessionFile({ sessionId: 'sid-1', name: 'From Registry' }));
      mockedReaddirSync.mockReturnValue(['a.json'] as never);

      const result = resolveSessionName({ session_id: 'sid-1', transcript_path: TRANSCRIPT_PATH });

      expect(result).toBe('From Registry');
    });

    it('falls back to the registry when the transcript has no custom-title record', () => {
      mockedReadFileSync
        .mockReturnValueOnce(transcript('{"type":"user","message":"hello"}'))
        .mockReturnValueOnce(sessionFile({ sessionId: 'sid-1', name: 'From Registry' }));
      mockedReaddirSync.mockReturnValue(['a.json'] as never);

      const result = resolveSessionName({ session_id: 'sid-1', transcript_path: TRANSCRIPT_PATH });

      expect(result).toBe('From Registry');
    });

    it('falls back to the registry when the transcript cannot be read', () => {
      mockedReadFileSync
        .mockImplementationOnce(() => {
          throw new Error('ENOENT');
        })
        .mockReturnValueOnce(sessionFile({ sessionId: 'sid-1', name: 'From Registry' }));
      mockedReaddirSync.mockReturnValue(['a.json'] as never);

      const result = resolveSessionName({ session_id: 'sid-1', transcript_path: TRANSCRIPT_PATH });

      expect(result).toBe('From Registry');
    });

    it('skips the transcript lookup when transcript_path is empty', () => {
      mockedReaddirSync.mockReturnValue([] as never);

      const result = resolveSessionName({ session_id: 'sid-1', transcript_path: '' });

      expect(result).toBeUndefined();
      expect(mockedReadFileSync).not.toHaveBeenCalled();
    });

    it('rewrites a subagent transcript path to the parent transcript before the title lookup', () => {
      const subagentPath = '/mock-home/.claude/projects/project/parent-sid/subagents/agent-abc.jsonl';
      mockedReadFileSync.mockReturnValueOnce(transcript(titleRecord('Main Project')));

      const result = resolveSessionName({ session_id: 'parent-sid', transcript_path: subagentPath });

      expect(result).toBe('Main Project');
      expect(mockedReadFileSync).toHaveBeenCalledWith('/mock-home/.claude/projects/project/parent-sid.jsonl', 'utf-8');
    });
  });

  describe('registry lookup', () => {
    it('reads the name from the matching registry record', () => {
      mockedReaddirSync.mockReturnValue(['record.json'] as never);
      mockedReadFileSync.mockReturnValueOnce(sessionFile({ sessionId: 'sid-1', name: 'Registry Name' }));

      const result = resolveSessionName({ session_id: 'sid-1' });

      expect(result).toBe('Registry Name');
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
      mockedReadFileSync
        .mockReturnValueOnce('{ not valid json')
        .mockReturnValueOnce(sessionFile({ sessionId: 'sid-1', name: 'Recovered' }));

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
  });

  it('returns undefined and skips all lookups when session_id is missing', () => {
    const result = resolveSessionName({});

    expect(result).toBeUndefined();
    expect(mockedReadFileSync).not.toHaveBeenCalled();
    expect(mockedReaddirSync).not.toHaveBeenCalled();
  });
});

describe('resolveSessionContext', () => {
  it('returns the session name unchanged for non-subagent events', () => {
    const result = resolveSessionContext('sessionCompleted', { session_id: 'sid-1', session_title: 'Main' }, 'fallback');

    expect(result).toBe('Main');
  });

  it('appends the agent_type for subagentCompleted events', () => {
    const result = resolveSessionContext(
      'subagentCompleted',
      { session_id: 'sid-1', session_title: 'Main', agent_type: 'Explore' },
      'fallback',
    );

    expect(result).toBe('Main(Explore)');
  });

  it('appends the agent_type for subagentStarted events', () => {
    const result = resolveSessionContext(
      'subagentStarted',
      { session_id: 'sid-1', session_title: 'Main', agent_type: 'general-purpose' },
      'fallback',
    );

    expect(result).toBe('Main(general-purpose)');
  });

  it('trims the agent_type before appending it', () => {
    const result = resolveSessionContext(
      'subagentCompleted',
      { session_id: 'sid-1', session_title: 'Main', agent_type: '  Explore  ' },
      'fallback',
    );

    expect(result).toBe('Main(Explore)');
  });

  it('omits the suffix on a subagent event when agent_type is missing', () => {
    const result = resolveSessionContext('subagentCompleted', { session_id: 'sid-1', session_title: 'Main' }, 'fallback');

    expect(result).toBe('Main');
  });

  it('omits the suffix on a subagent event when agent_type is blank', () => {
    const result = resolveSessionContext(
      'subagentCompleted',
      { session_id: 'sid-1', session_title: 'Main', agent_type: '   ' },
      'fallback',
    );

    expect(result).toBe('Main');
  });

  it('uses the fallback name when the session name cannot be resolved', () => {
    mockedReaddirSync.mockReturnValue([] as never);

    const result = resolveSessionContext('subagentCompleted', { session_id: 'sid-1', agent_type: 'Explore' }, 'my-project');

    expect(result).toBe('my-project(Explore)');
  });

  it('combines the resolved parent session name with the agent label for a subagent transcript', () => {
    const subagentPath = '/mock-home/.claude/projects/project/parent-sid/subagents/agent-abc.jsonl';
    mockedReadFileSync.mockReturnValueOnce(transcript(titleRecord('Main Project')));

    const result = resolveSessionContext(
      'subagentCompleted',
      { session_id: 'parent-sid', transcript_path: subagentPath, agent_type: 'Explore' },
      'fallback',
    );

    expect(result).toBe('Main Project(Explore)');
  });
});
