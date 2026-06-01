import { readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { HookData } from './types.js';

const SESSIONS_DIR = join(homedir(), '.claude', 'sessions');

interface SessionRecord {
  sessionId?: unknown;
  name?: unknown;
}

function normalizeSessionName(name: unknown, sessionId: string): string | undefined {
  if (typeof name !== 'string') {
    return undefined;
  }

  const trimmed = name.trim();
  // Claude Code uses the session id prefix as the display name when the user
  // has not set a custom one (e.g. "077dcc04"). Treat those as unset so the
  // caller can fall back to the working-directory name.
  if (!trimmed || sessionId.startsWith(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function lookupSessionName(sessionId: string): string | undefined {
  let files: string[];
  try {
    files = readdirSync(SESSIONS_DIR);
  } catch {
    return undefined;
  }

  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }

    try {
      const raw = readFileSync(join(SESSIONS_DIR, file), 'utf-8');
      const record = JSON.parse(raw) as SessionRecord;
      if (record.sessionId !== sessionId) {
        continue;
      }

      return normalizeSessionName(record.name, sessionId);
    } catch {
      // Ignore unreadable or malformed session files and keep scanning.
    }
  }

  return undefined;
}

/**
 * Resolves the custom session name for the current Claude Code session.
 *
 * Claude Code does not expose the session name through a stable public API, so
 * it is sourced best-effort from two places:
 *   1. The `session_title` hook field (only present on the SessionStart event).
 *   2. The `name` field of the matching record under `~/.claude/sessions/*.json`
 *      (covers every other hook event).
 *
 * Returns `undefined` when no custom name is set or the lookup fails, letting
 * the caller fall back to the working-directory name.
 */
export function resolveSessionName(hookData: HookData): string | undefined {
  const sessionId = typeof hookData.session_id === 'string' ? hookData.session_id : '';

  const inlineName = normalizeSessionName(hookData.session_title, sessionId);
  if (inlineName) {
    return inlineName;
  }

  if (sessionId) {
    return lookupSessionName(sessionId);
  }

  return undefined;
}
