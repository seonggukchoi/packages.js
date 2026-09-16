export type Locale = 'en' | 'ko';

export type EventKey =
  | 'sessionStarted'
  | 'sessionCompleted'
  | 'sessionInterrupted'
  | 'sessionCompacted'
  | 'permissionRequested'
  | 'decisionNeeded'
  | 'subagentStarted'
  | 'subagentCompleted'
  | 'toolExecuting'
  | 'toolCompleted';

export interface EventOptions {
  enabled: boolean;
  message?: string;
}

// --- Channel types ---

export interface NotificationChannel {
  readonly type: string;
  send(params: { title: string; message: string; context: string; icon?: string; sound?: string }): void | Promise<void>;
}

export interface ChannelConfig {
  enabled: boolean;
  events?: Partial<Record<EventKey, EventOptions>>;
}

export type MacOSChannelConfig = ChannelConfig;

export interface TelegramChannelConfig extends ChannelConfig {
  botToken: string;
  chatId: string;
  /**
   * Milliseconds Node waits for a single address family before falling back to the next one while
   * connecting to the Telegram API. Must be an integer from 1 to 2147483647, the range Node
   * accepts; Node raises anything below 10 up to 10. Omitted means the channel default.
   */
  connectAttemptTimeoutMs?: number;
}

export interface ChannelsConfig {
  macos?: MacOSChannelConfig;
  telegram?: TelegramChannelConfig;
}

export interface ChannelEntry {
  channel: NotificationChannel;
  events: Record<EventKey, EventOptions>;
}

// --- Config ---

export interface NotifierConfig {
  locale: Locale;
  workspace?: string;
  events: Record<EventKey, EventOptions>;
  channels: ChannelsConfig;
}

// --- Messages ---

export interface Messages {
  sessionStarted: string;
  sessionCompleted: string;
  sessionInterrupted: string;
  sessionCompacted: string;
  permissionRequested: string;
  decisionRequired: string;
  decisionNeeded: (question: string) => string;
  subagentStarted: (description: string) => string;
  subagentCompleted: string;
  toolExecuting: (toolName: string) => string;
  toolCompleted: (toolName: string) => string;
}

export interface TerminalInfo {
  app: string;
  projectName: string;
  icon: string;
}

export type NotifyFunction = (eventKey: EventKey, title: string, message: string, sound?: string) => void;

// --- Hook data ---

/**
 * The JSON payload Codex writes to a hook's stdin. Only the fields this plugin reads are typed;
 * the generated schemas under `codex-rs/hooks/schema/generated/` in openai/codex list the rest.
 * `session_id` is the root thread id even inside a spawned subagent, whose own thread id arrives
 * as `agent_id`.
 */
export interface HookData {
  cwd?: string;
  session_id?: string;
  transcript_path?: string | null;
  hook_event_name?: string;
  turn_id?: string;
  agent_id?: string;
  agent_type?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_use_id?: string;
  [key: string]: unknown;
}
