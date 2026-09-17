import { createSessionRegistry, normalizeSessionTitle } from './session.js';

import type { SessionClient } from './session.js';
import type { SessionInfo } from './types.js';

function createClient(sessions: Record<string, Partial<SessionInfo> | undefined> = {}) {
  const get = vi.fn(async ({ path }: { path: { id: string } }) => ({ data: sessions[path.id] as SessionInfo | undefined }));
  const client: SessionClient = { session: { get } };
  return { client, get };
}

describe('normalizeSessionTitle', () => {
  it('returns a trimmed custom title', () => {
    expect(normalizeSessionTitle('  Fix login bug  ')).toBe('Fix login bug');
  });

  it('treats the placeholder title of a new session as unset', () => {
    expect(normalizeSessionTitle('New session - 2026-09-17T09:00:00.000Z')).toBeUndefined();
    expect(normalizeSessionTitle('Child session - 2026-09-17T09:00:00.000Z')).toBeUndefined();
  });

  it('keeps a title that merely starts like the placeholder', () => {
    expect(normalizeSessionTitle('New session - notes')).toBe('New session - notes');
  });

  it('returns undefined for blank or non-string titles', () => {
    expect(normalizeSessionTitle('')).toBeUndefined();
    expect(normalizeSessionTitle('   ')).toBeUndefined();
    expect(normalizeSessionTitle(undefined)).toBeUndefined();
    expect(normalizeSessionTitle(42)).toBeUndefined();
  });
});

describe('createSessionRegistry', () => {
  describe('resolveContext', () => {
    it('falls back to the directory name when no session id is given', async () => {
      const { client, get } = createClient();
      const registry = createSessionRegistry(client, 'my-project');

      await expect(registry.resolveContext(undefined)).resolves.toBe('my-project');
      expect(get).not.toHaveBeenCalled();
    });

    it('uses the title observed from session.created', async () => {
      const { client, get } = createClient();
      const registry = createSessionRegistry(client, 'my-project');

      registry.observe({ type: 'session.created', properties: { info: { id: 's1', title: 'Fix login bug' } } });

      await expect(registry.resolveContext('s1')).resolves.toBe('Fix login bug');
      expect(get).not.toHaveBeenCalled();
    });

    it('reflects a rename delivered by session.updated', async () => {
      const { client } = createClient();
      const registry = createSessionRegistry(client, 'my-project');

      registry.observe({ type: 'session.created', properties: { info: { id: 's1', title: 'Old title' } } });
      registry.observe({ type: 'session.updated', properties: { info: { id: 's1', title: 'New title' } } });

      await expect(registry.resolveContext('s1')).resolves.toBe('New title');
    });

    it('falls back to the directory name while the session still has its placeholder title', async () => {
      const { client } = createClient();
      const registry = createSessionRegistry(client, 'my-project');

      registry.observe({
        type: 'session.created',
        properties: { info: { id: 's1', title: 'New session - 2026-09-17T09:00:00.000Z' } },
      });

      await expect(registry.resolveContext('s1')).resolves.toBe('my-project');
    });

    it('fetches an unknown session through the client and caches it', async () => {
      const { client, get } = createClient({ s1: { id: 's1', title: 'Resumed session' } });
      const registry = createSessionRegistry(client, 'my-project');

      await expect(registry.resolveContext('s1')).resolves.toBe('Resumed session');
      await expect(registry.resolveContext('s1')).resolves.toBe('Resumed session');
      expect(get).toHaveBeenCalledTimes(1);
      expect(get).toHaveBeenCalledWith({ path: { id: 's1' } });
    });

    it('falls back to the directory name when the client returns no session', async () => {
      const { client } = createClient({ s1: undefined });
      const registry = createSessionRegistry(client, 'my-project');

      await expect(registry.resolveContext('s1')).resolves.toBe('my-project');
    });

    it('falls back to the directory name when the client throws', async () => {
      const client: SessionClient = { session: { get: vi.fn().mockRejectedValue(new Error('offline')) } };
      const registry = createSessionRegistry(client, 'my-project');

      await expect(registry.resolveContext('s1')).resolves.toBe('my-project');
    });

    it('resolves a child session to its root session title', async () => {
      const { client } = createClient();
      const registry = createSessionRegistry(client, 'my-project');

      registry.observe({ type: 'session.created', properties: { info: { id: 'root', title: 'Main work' } } });
      registry.observe({
        type: 'session.created',
        properties: { info: { id: 'child', title: 'Child session - 2026-09-17T09:00:00.000Z', parentID: 'root' } },
      });
      registry.observe({
        type: 'session.created',
        properties: { info: { id: 'grandchild', title: 'Nested', parentID: 'child' } },
      });

      await expect(registry.resolveContext('grandchild')).resolves.toBe('Main work');
    });

    it('stops at the last reachable ancestor when a parent cannot be fetched', async () => {
      const { client } = createClient();
      const registry = createSessionRegistry(client, 'my-project');

      registry.observe({ type: 'session.created', properties: { info: { id: 'child', title: 'Child work', parentID: 'missing' } } });

      await expect(registry.resolveContext('child')).resolves.toBe('Child work');
    });

    it('does not loop forever on a parent cycle', async () => {
      const { client } = createClient();
      const registry = createSessionRegistry(client, 'my-project');

      registry.observe({ type: 'session.created', properties: { info: { id: 'a', title: 'A', parentID: 'b' } } });
      registry.observe({ type: 'session.created', properties: { info: { id: 'b', title: 'B', parentID: 'a' } } });

      await expect(registry.resolveContext('a')).resolves.toMatch(/^[AB]$/);
    });

    it('appends the agent label as session(agent)', async () => {
      const { client } = createClient();
      const registry = createSessionRegistry(client, 'my-project');

      registry.observe({ type: 'session.created', properties: { info: { id: 's1', title: 'Main work' } } });

      await expect(registry.resolveContext('s1', 'explore')).resolves.toBe('Main work(explore)');
      await expect(registry.resolveContext(undefined, ' general ')).resolves.toBe('my-project(general)');
    });

    it('omits the agent label when it is blank', async () => {
      const { client } = createClient();
      const registry = createSessionRegistry(client, 'my-project');

      await expect(registry.resolveContext(undefined, '   ')).resolves.toBe('my-project');
    });
  });

  describe('observe', () => {
    it('forgets a session on session.deleted', async () => {
      const { client, get } = createClient({ s1: { id: 's1', title: 'Fetched again' } });
      const registry = createSessionRegistry(client, 'my-project');

      registry.observe({ type: 'session.created', properties: { info: { id: 's1', title: 'Cached' } } });
      registry.observe({ type: 'session.deleted', properties: { info: { id: 's1', title: 'Cached' } } });

      await expect(registry.resolveContext('s1')).resolves.toBe('Fetched again');
      expect(get).toHaveBeenCalledTimes(1);
    });

    it('ignores session events without a usable info record', async () => {
      const { client, get } = createClient({ s1: undefined });
      const registry = createSessionRegistry(client, 'my-project');

      registry.observe({ type: 'session.created' });
      registry.observe({ type: 'session.updated', properties: { info: 'not-an-object' } });
      registry.observe({ type: 'session.deleted', properties: { info: { title: 'no id' } } });
      registry.observe({ type: 'session.created', properties: { info: { id: '' } } });

      await expect(registry.resolveContext('s1')).resolves.toBe('my-project');
      expect(get).toHaveBeenCalledTimes(1);
    });

    it('ignores non-string title and empty parentID fields', async () => {
      const { client } = createClient();
      const registry = createSessionRegistry(client, 'my-project');

      registry.observe({ type: 'session.created', properties: { info: { id: 's1', title: 7, parentID: '' } } });

      await expect(registry.isChildSession('s1')).resolves.toBe(false);
      await expect(registry.resolveContext('s1')).resolves.toBe('my-project');
    });

    it('ignores unrelated events', async () => {
      const { client, get } = createClient({ s1: undefined });
      const registry = createSessionRegistry(client, 'my-project');

      registry.observe({ type: 'session.idle', properties: { sessionID: 's1' } });

      await expect(registry.resolveContext('s1')).resolves.toBe('my-project');
      expect(get).toHaveBeenCalledTimes(1);
    });
  });

  describe('isChildSession', () => {
    it('is false without a session id', async () => {
      const { client } = createClient();
      const registry = createSessionRegistry(client, 'my-project');

      await expect(registry.isChildSession(undefined)).resolves.toBe(false);
    });

    it('is true for a session with a parent', async () => {
      const { client } = createClient({ child: { id: 'child', parentID: 'root' } });
      const registry = createSessionRegistry(client, 'my-project');

      await expect(registry.isChildSession('child')).resolves.toBe(true);
    });

    it('is false for a root session and for an unknown session', async () => {
      const { client } = createClient({ root: { id: 'root' }, unknown: undefined });
      const registry = createSessionRegistry(client, 'my-project');

      await expect(registry.isChildSession('root')).resolves.toBe(false);
      await expect(registry.isChildSession('unknown')).resolves.toBe(false);
    });
  });
});
