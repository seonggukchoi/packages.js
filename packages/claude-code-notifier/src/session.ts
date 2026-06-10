import { readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { HookData } from './types.js';

const SESSIONS_DIR = join(homedir(), '.claude', 'sessions');
const CUSTOM_TITLE_MARKER = '"custom-title"';

interface SessionRecord {
  sessionId?: unknown;
  name?: unknown;
}

interface TranscriptRecord {
  type?: unknown;
  customTitle?: unknown;
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

function lookupTranscriptTitle(transcriptPath: string, sessionId: string): string | undefined {
  let raw: string;
  try {
    raw = readFileSync(transcriptPath, 'utf-8');
  } catch {
    return undefined;
  }

  // Renaming a session appends a `custom-title` record to the transcript, so
  // scan from the end to pick up the most recent rename.
  const lines = raw.split('\n');
  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index];
    if (!line || !line.includes(CUSTOM_TITLE_MARKER)) {
      continue;
    }

    try {
      const record = JSON.parse(line) as TranscriptRecord;
      if (record.type !== 'custom-title') {
        continue;
      }

      const name = normalizeSessionName(record.customTitle, sessionId);
      if (name) {
        return name;
      }
    } catch {
      // Ignore partially written or malformed lines and keep scanning.
    }
  }

  return undefined;
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
 * it is sourced best-effort, in order:
 *   1. The `session_title` hook field (only present on the SessionStart event,
 *      and only when a name was already set).
 *   2. The most recent `custom-title` record in the session transcript.
 *      `transcript_path` is part of every hook payload, so this covers every
 *      event and every session kind.
 *   3. The `name` field of the matching record under `~/.claude/sessions/*.json`.
 *      This registry is only populated for some session kinds, so it is kept as
 *      a last resort.
 *
 * Returns `undefined` when no custom name is set or every lookup fails, letting
 * the caller fall back to the working-directory name.
 */
export function resolveSessionName(hookData: HookData): string | undefined {
  const sessionId = typeof hookData.session_id === 'string' ? hookData.session_id : '';

  const inlineName = normalizeSessionName(hookData.session_title, sessionId);
  if (inlineName) {
    return inlineName;
  }

  if (typeof hookData.transcript_path === 'string' && hookData.transcript_path) {
    const transcriptName = lookupTranscriptTitle(hookData.transcript_path, sessionId);
    if (transcriptName) {
      return transcriptName;
    }
  }

  if (sessionId) {
    return lookupSessionName(sessionId);
  }

  return undefined;
}
