import { homedir } from 'node:os';
import { join } from 'node:path';

const PLUGIN_DIR_NAME = 'codex-notifier';

/**
 * Resolves the Codex home directory the same way Codex does: `CODEX_HOME` when set to a non-empty
 * value, otherwise `~/.codex`. Codex passes its own environment to hook processes, so this stays
 * in sync with the session that fired the hook.
 */
export function resolveCodexHome(): string {
  const configured = process.env.CODEX_HOME;
  if (configured) {
    return configured;
  }

  return join(homedir(), '.codex');
}

/** The directory holding this plugin's config file and icon cache. */
export function resolvePluginDir(): string {
  return join(resolveCodexHome(), 'plugins', PLUGIN_DIR_NAME);
}
