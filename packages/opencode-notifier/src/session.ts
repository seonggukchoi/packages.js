import type { SessionInfo } from './types.js';

// OpenCode gives every new session a placeholder title until the first response is summarized
// (`Session.isDefaultTitle` in packages/opencode/src/session/session.ts). Treat those as unset so
// the caller can fall back to the working-directory name.
const DEFAULT_TITLE_PATTERN = /^(New session|Child session) - \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// Guards the parent walk against a cycle in malformed session data.
const MAX_PARENT_DEPTH = 8;

/** The part of the OpenCode SDK client the registry needs to look a session up by id. */
export interface SessionClient {
  session: {
    get(options: { path: { id: string } }): Promise<{ data?: SessionInfo | undefined }>;
  };
}

export interface SessionEvent {
  type: string;
  properties?: Record<string, unknown>;
}

export interface SessionRegistry {
  /** Feeds a plugin event so session titles and parents stay current without extra lookups. */
  observe(event: SessionEvent): void;
  /** Whether the session was spawned by another session (a subagent run by the task tool). */
  isChildSession(sessionID: string | undefined): Promise<boolean>;
  /**
   * Builds the display context shown in notifications: the root session's title when it has a
   * real one, otherwise the working-directory name, with the agent label appended as
   * `session(agent)` for subagent events.
   */
  resolveContext(sessionID: string | undefined, agentLabel?: string): Promise<string>;
}

export function normalizeSessionTitle(title: unknown): string | undefined {
  if (typeof title !== 'string') {
    return undefined;
  }

  const trimmed = title.trim();
  if (!trimmed || DEFAULT_TITLE_PATTERN.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function toSessionInfo(raw: unknown): SessionInfo | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }

  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || !record.id) {
    return undefined;
  }

  return {
    id: record.id,
    ...(typeof record.title === 'string' ? { title: record.title } : {}),
    ...(typeof record.parentID === 'string' && record.parentID ? { parentID: record.parentID } : {}),
  };
}

/**
 * Tracks the sessions the OpenCode server reports to this plugin.
 *
 * OpenCode publishes `session.created` / `session.updated` / `session.deleted` with the full
 * session record, so titles (generated after the first response, or set by a rename) and parent
 * links arrive without any request. Sessions that existed before the plugin loaded, such as a
 * resumed one, are fetched once through the SDK client and cached afterwards.
 */
export function createSessionRegistry(client: SessionClient, fallbackName: string): SessionRegistry {
  const sessions = new Map<string, SessionInfo>();

  async function lookup(sessionID: string | undefined): Promise<SessionInfo | undefined> {
    if (!sessionID) {
      return undefined;
    }

    const cached = sessions.get(sessionID);
    if (cached) {
      return cached;
    }

    try {
      const result = await client.session.get({ path: { id: sessionID } });
      const info = toSessionInfo(result.data);
      if (info) {
        sessions.set(info.id, info);
      }
      return info;
    } catch {
      return undefined;
    }
  }

  async function resolveRoot(sessionID: string | undefined): Promise<SessionInfo | undefined> {
    let current = await lookup(sessionID);
    for (let depth = 0; current?.parentID && depth < MAX_PARENT_DEPTH; depth++) {
      const parent = await lookup(current.parentID);
      if (!parent) {
        break;
      }
      current = parent;
    }
    return current;
  }

  return {
    observe(event) {
      switch (event.type) {
        case 'session.created':
        case 'session.updated': {
          const info = toSessionInfo(event.properties?.info);
          if (info) {
            sessions.set(info.id, info);
          }
          break;
        }
        case 'session.deleted': {
          const info = toSessionInfo(event.properties?.info);
          if (info) {
            sessions.delete(info.id);
          }
          break;
        }
        default:
          break;
      }
    },

    async isChildSession(sessionID) {
      const info = await lookup(sessionID);
      return Boolean(info?.parentID);
    },

    async resolveContext(sessionID, agentLabel) {
      const root = await resolveRoot(sessionID);
      const sessionName = normalizeSessionTitle(root?.title) ?? fallbackName;
      const label = agentLabel?.trim();
      return label ? `${sessionName}(${label})` : sessionName;
    },
  };
}
