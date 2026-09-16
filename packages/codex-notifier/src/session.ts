import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { resolveCodexHome } from './paths.js';

import type { EventKey, HookData } from './types.js';

const SESSION_INDEX_FILE_NAME = 'session_index.jsonl';

// Subagent events fire with the parent session's context, so the agent label is
// appended to the resolved (parent) session name when building their context.
const SUBAGENT_EVENT_KEYS: ReadonlySet<EventKey> = new Set<EventKey>(['subagentStarted', 'subagentCompleted']);

interface SessionIndexEntry {
  id?: unknown;
  thread_name?: unknown;
}

function normalizeThreadName(name: unknown): string | undefined {
  if (typeof name !== 'string') {
    return undefined;
  }

  const trimmed = name.trim();
  return trimmed ? trimmed : undefined;
}

function lookupThreadName(threadId: string): string | undefined {
  let raw: string;
  try {
    raw = readFileSync(join(resolveCodexHome(), SESSION_INDEX_FILE_NAME), 'utf-8');
  } catch {
    return undefined;
  }

  // Codex appends a record every time a thread is named and resolves names by
  // taking the newest record for the id, so scan from the end and stop at the
  // first match. Clearing a name appends an empty `thread_name`, which is why
  // the scan must not continue past that record to an older name.
  const lines = raw.split('\n');
  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index];
    if (!line || !line.includes(threadId)) {
      continue;
    }

    try {
      const entry = JSON.parse(line) as SessionIndexEntry;
      if (entry.id !== threadId) {
        continue;
      }

      return normalizeThreadName(entry.thread_name);
    } catch {
      // Ignore partially written or malformed lines and keep scanning.
    }
  }

  return undefined;
}

function resolveAgentLabel(hookData: HookData): string | undefined {
  // `agent_type` is the role of the spawned agent (e.g. "explorer", "worker"),
  // which is far more recognizable than the opaque `agent_id` thread id.
  const agentType = typeof hookData.agent_type === 'string' ? hookData.agent_type.trim() : '';
  return agentType || undefined;
}

/**
 * Resolves the thread name of the Codex session that fired the hook.
 *
 * Codex records thread names (both the ones it generates from the first
 * message and the ones set with `/rename`) in `<CODEX_HOME>/session_index.jsonl`
 * as append-only `{ id, thread_name, updated_at }` records, and reads them back
 * newest-first. The hook payload carries the root thread id as `session_id` even
 * for subagent events, so the lookup always lands on the main session's name.
 *
 * Returns `undefined` when the thread has no name, the name was cleared, or the
 * index cannot be read, letting the caller fall back to the working-directory name.
 */
export function resolveSessionName(hookData: HookData): string | undefined {
  const sessionId = typeof hookData.session_id === 'string' ? hookData.session_id : '';
  if (!sessionId) {
    return undefined;
  }

  return lookupThreadName(sessionId);
}

/**
 * Builds the session display context shown in notifications.
 *
 * Subagent events (`subagentStarted` / `subagentCompleted`) fire from the
 * spawned agent's thread, but `session_id` still identifies the root thread, so
 * the resolved name is the MAIN session. The spawned agent's `agent_type` is
 * appended as `main(agent)` so a remote notification makes clear which session,
 * and which delegated agent, the alert came from. Every other event returns the
 * resolved session name unchanged.
 */
export function resolveSessionContext(eventKey: EventKey, hookData: HookData, fallbackName: string): string {
  const sessionName = resolveSessionName(hookData) ?? fallbackName;

  if (!SUBAGENT_EVENT_KEYS.has(eventKey)) {
    return sessionName;
  }

  const agentLabel = resolveAgentLabel(hookData);
  return agentLabel ? `${sessionName}(${agentLabel})` : sessionName;
}
