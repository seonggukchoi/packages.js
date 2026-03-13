import { en } from './en.js';
import { ko } from './ko.js';

import { getMessages } from './index.js';

import type { EventKey, EventOptions } from '../types.js';

function buildDefaultEvents(overrides: Partial<Record<EventKey, EventOptions>> = {}): Record<EventKey, EventOptions> {
  const keys: EventKey[] = [
    'sessionStarted',
    'sessionCompleted',
    'sessionError',
    'sessionCompacted',
    'permissionRequested',
    'decisionNeeded',
    'subagentStarted',
    'subagentCompleted',
    'toolExecuting',
    'toolCompleted',
  ];
  const events = {} as Record<EventKey, EventOptions>;
  for (const key of keys) {
    events[key] = overrides[key] ?? { enabled: true };
  }
  return events;
}

describe('getMessages', () => {
  it('returns English messages by default', () => {
    const messages = getMessages('en', buildDefaultEvents());

    expect(messages.sessionStarted).toBe('Session started.');
    expect(messages.sessionCompleted).toBe('Session completed.');
    expect(messages.sessionError).toBe('An error occurred.');
  });

  it('returns Korean messages for ko locale', () => {
    const messages = getMessages('ko', buildDefaultEvents());

    expect(messages.sessionStarted).toBe('작업을 시작했습니다.');
    expect(messages.sessionCompleted).toBe('작업이 완료되었습니다.');
    expect(messages.sessionError).toBe('오류가 발생했습니다.');
  });

  it('falls back to English for unknown locale', () => {
    const messages = getMessages('fr' as 'en', buildDefaultEvents());

    expect(messages.sessionStarted).toBe('Session started.');
  });

  it('overrides string messages from event config', () => {
    const events = buildDefaultEvents({
      sessionStarted: { enabled: true, message: 'Custom start!' },
    });

    const messages = getMessages('en', events);

    expect(messages.sessionStarted).toBe('Custom start!');
  });

  it('overrides template function messages from event config', () => {
    const events = buildDefaultEvents({
      decisionNeeded: { enabled: true, message: 'Please decide: {{question}}' },
    });

    const messages = getMessages('en', events);

    expect(messages.decisionNeeded('What to do?')).toBe('Please decide: What to do?');
  });

  it('keeps original messages when no custom message provided', () => {
    const events = buildDefaultEvents({
      sessionStarted: { enabled: true },
    });

    const messages = getMessages('en', events);

    expect(messages.sessionStarted).toBe('Session started.');
    expect(messages.decisionNeeded('test')).toBe('Decision needed: test');
  });
});

describe('en messages', () => {
  it('exposes all arrow function message properties', () => {
    expect(en.decisionNeeded('test')).toBe('Decision needed: test');
    expect(en.subagentStarted('analyze')).toBe('Subagent started: analyze');
    expect(en.toolExecuting('bash')).toBe('bash executing...');
    expect(en.toolCompleted('read')).toBe('read completed.');
  });
});

describe('ko messages', () => {
  it('exposes all arrow function message properties', () => {
    expect(ko.decisionNeeded('test')).toContain('test');
    expect(ko.subagentStarted('analyze')).toContain('analyze');
    expect(ko.toolExecuting('bash')).toContain('bash');
    expect(ko.toolCompleted('read')).toContain('read');
  });
});
