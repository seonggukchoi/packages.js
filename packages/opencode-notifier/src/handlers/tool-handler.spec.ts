import { createToolAfterHandler, createToolBeforeHandler } from './tool-handler.js';

import type { SessionRegistry } from '../session.js';
import type { Messages, NotifyFunction } from '../types.js';

function createMockMessages(): Messages {
  return {
    sessionStarted: 'Session started.',
    sessionCompleted: 'Session completed.',
    sessionError: 'An error occurred.',
    sessionCompacted: 'Session compacted.',
    permissionRequested: 'Permission requested.',
    decisionRequired: 'Decision required.',
    decisionNeeded: (question: string) => `Decision needed: ${question}`,
    subagentStarted: (description: string) => `Subagent started: ${description}`,
    subagentCompleted: 'Subagent task completed.',
    toolExecuting: (toolName: string) => `${toolName} executing...`,
    toolCompleted: (toolName: string) => `${toolName} completed.`,
  };
}

function createMockSessions() {
  return {
    observe: vi.fn(),
    isChildSession: vi.fn(async () => false),
    resolveContext: vi.fn(async (sessionID?: string, agentLabel?: string) => {
      const name = sessionID ? `ctx:${sessionID}` : 'ctx:none';
      return agentLabel ? `${name}(${agentLabel})` : name;
    }),
  } satisfies SessionRegistry;
}

describe('createToolBeforeHandler', () => {
  let notify: NotifyFunction;
  let sessions: ReturnType<typeof createMockSessions>;
  let handler: ReturnType<typeof createToolBeforeHandler>;

  beforeEach(() => {
    notify = vi.fn();
    sessions = createMockSessions();
    handler = createToolBeforeHandler(notify, createMockMessages(), sessions);
  });

  it('sends decision notification for question tool', async () => {
    const input = { tool: 'question', sessionID: 's1' };
    const output = { args: { questions: [{ question: 'What should I do?' }] } };

    await handler(input, output);

    expect(notify).toHaveBeenCalledWith(
      { eventKey: 'decisionNeeded', title: '🙋 OpenCode', message: 'Decision needed: What should I do?', sound: 'Glass' },
      'ctx:s1',
    );
  });

  it('sends subagent notification for task tool with the agent label in the context', async () => {
    const input = { tool: 'Task', sessionID: 's1' };
    const output = { args: { description: 'Analyze code', subagent_type: 'explore' } };

    await handler(input, output);

    expect(sessions.resolveContext).toHaveBeenCalledWith('s1', 'explore');
    expect(notify).toHaveBeenCalledWith(
      { eventKey: 'subagentStarted', title: '🤖 OpenCode', message: 'Subagent started: Analyze code', sound: 'Submarine' },
      'ctx:s1(explore)',
    );
  });

  it('sends tool executing notification for mcp_ tools', async () => {
    const input = { tool: 'mcp_bash', sessionID: 's1' };
    const output = { args: {} };

    await handler(input, output);

    expect(notify).toHaveBeenCalledWith(
      { eventKey: 'toolExecuting', title: '🔧 OpenCode', message: 'bash executing...', sound: 'Tink' },
      'ctx:s1',
    );
  });

  it('handles question tool with no questions array', async () => {
    await handler({ tool: 'question' }, { args: {} });

    expect(notify).toHaveBeenCalledWith(
      { eventKey: 'decisionNeeded', title: '🙋 OpenCode', message: 'Decision needed: Decision required.', sound: 'Glass' },
      'ctx:none',
    );
  });

  it('handles task tool with no description and no agent type', async () => {
    await handler({ tool: 'Task' }, { args: {} });

    expect(sessions.resolveContext).toHaveBeenCalledWith(undefined, undefined);
    expect(notify).toHaveBeenCalledWith(
      { eventKey: 'subagentStarted', title: '🤖 OpenCode', message: 'Subagent started: task delegation', sound: 'Submarine' },
      'ctx:none',
    );
  });

  it('does not notify for unknown tool types', async () => {
    await handler({ tool: 'unknown-tool' }, { args: {} });

    expect(notify).not.toHaveBeenCalled();
    expect(sessions.resolveContext).not.toHaveBeenCalled();
  });

  it('handles missing tool and args in input/output', async () => {
    await handler({}, {});
    await handler(undefined, undefined);

    expect(notify).not.toHaveBeenCalled();
  });

  it('handles question tool with empty questions array', async () => {
    await handler({ tool: 'question' }, { args: { questions: [] } });

    expect(notify).toHaveBeenCalledWith(
      { eventKey: 'decisionNeeded', title: '🙋 OpenCode', message: 'Decision needed: Decision required.', sound: 'Glass' },
      'ctx:none',
    );
  });

  it('handles question tool with question missing question property', async () => {
    await handler({ tool: 'question' }, { args: { questions: [{}] } });

    expect(notify).toHaveBeenCalledWith(
      { eventKey: 'decisionNeeded', title: '🙋 OpenCode', message: 'Decision needed: Decision required.', sound: 'Glass' },
      'ctx:none',
    );
  });
});

describe('createToolAfterHandler', () => {
  let notify: NotifyFunction;
  let sessions: ReturnType<typeof createMockSessions>;
  let handler: ReturnType<typeof createToolAfterHandler>;

  beforeEach(() => {
    notify = vi.fn();
    sessions = createMockSessions();
    handler = createToolAfterHandler(notify, createMockMessages(), sessions);
  });

  it('sends subagent completed notification for task tool with the agent label', async () => {
    await handler({ tool: 'Task', sessionID: 's1', args: { subagent_type: 'general' } });

    expect(sessions.resolveContext).toHaveBeenCalledWith('s1', 'general');
    expect(notify).toHaveBeenCalledWith(
      { eventKey: 'subagentCompleted', title: '🤖 OpenCode', message: 'Subagent task completed.', sound: 'Hero' },
      'ctx:s1(general)',
    );
  });

  it('sends subagent completed notification without args', async () => {
    await handler({ tool: 'task' });

    expect(sessions.resolveContext).toHaveBeenCalledWith(undefined, undefined);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('sends tool completed notification for mcp_ tools', async () => {
    await handler({ tool: 'mcp_read', sessionID: 's1' });

    expect(notify).toHaveBeenCalledWith(
      { eventKey: 'toolCompleted', title: '✓ OpenCode', message: 'read completed.', sound: 'Blow' },
      'ctx:s1',
    );
  });

  it('does nothing for other tools', async () => {
    await handler({ tool: 'question' });

    expect(notify).not.toHaveBeenCalled();
  });

  it('handles missing tool property in input', async () => {
    await handler({});
    await handler(undefined);

    expect(notify).not.toHaveBeenCalled();
  });
});
