import { createToolAfterHandler, createToolBeforeHandler } from './tool-handler.js';

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

describe('createToolBeforeHandler', () => {
  let notify: NotifyFunction;
  let handler: ReturnType<typeof createToolBeforeHandler>;

  beforeEach(() => {
    notify = vi.fn();
    handler = createToolBeforeHandler(notify, createMockMessages());
  });

  it('sends decision notification for question tool', async () => {
    const input = { tool: 'question' };
    const output = { args: { questions: [{ question: 'What should I do?' }] } };

    await handler(input, output);

    expect(notify).toHaveBeenCalledWith('decisionNeeded', '🙋 OpenCode', 'Decision needed: What should I do?', 'Glass');
  });

  it('sends subagent notification for task tool (case insensitive)', async () => {
    const input = { tool: 'Task' };
    const output = { args: { description: 'Analyze code' } };

    await handler(input, output);

    expect(notify).toHaveBeenCalledWith('subagentStarted', '🤖 OpenCode', 'Subagent started: Analyze code', 'Submarine');
  });

  it('sends tool executing notification for mcp_ tools', async () => {
    const input = { tool: 'mcp_bash' };
    const output = { args: {} };

    await handler(input, output);

    expect(notify).toHaveBeenCalledWith('toolExecuting', '🔧 OpenCode', 'bash executing...', 'Tink');
  });

  it('handles question tool with no questions array', async () => {
    const input = { tool: 'question' };
    const output = { args: {} };

    await handler(input, output);

    expect(notify).toHaveBeenCalledWith('decisionNeeded', '🙋 OpenCode', 'Decision needed: Decision required.', 'Glass');
  });

  it('handles task tool with no description', async () => {
    const input = { tool: 'Task' };
    const output = { args: {} };

    await handler(input, output);

    expect(notify).toHaveBeenCalledWith('subagentStarted', '🤖 OpenCode', 'Subagent started: task delegation', 'Submarine');
  });

  it('does not notify for unknown tool types', async () => {
    const input = { tool: 'unknown-tool' };
    const output = { args: {} };

    await handler(input, output);

    expect(notify).not.toHaveBeenCalled();
  });

  it('handles missing tool and args in input/output', async () => {
    const input = {};
    const output = {};

    await handler(input, output);

    expect(notify).not.toHaveBeenCalled();
  });

  it('handles question tool with empty questions array', async () => {
    const input = { tool: 'question' };
    const output = { args: { questions: [] } };

    await handler(input, output);

    expect(notify).toHaveBeenCalledWith('decisionNeeded', '🙋 OpenCode', 'Decision needed: Decision required.', 'Glass');
  });

  it('handles question tool with question missing question property', async () => {
    const input = { tool: 'question' };
    const output = { args: { questions: [{}] } };

    await handler(input, output);

    expect(notify).toHaveBeenCalledWith('decisionNeeded', '🙋 OpenCode', 'Decision needed: Decision required.', 'Glass');
  });
});

describe('createToolAfterHandler', () => {
  let notify: NotifyFunction;
  let handler: ReturnType<typeof createToolAfterHandler>;

  beforeEach(() => {
    notify = vi.fn();
    handler = createToolAfterHandler(notify, createMockMessages());
  });

  it('sends subagent completed notification for task tool', async () => {
    const input = { tool: 'Task' };

    await handler(input);

    expect(notify).toHaveBeenCalledWith('subagentCompleted', '🤖 OpenCode', 'Subagent task completed.', 'Hero');
  });

  it('sends tool completed notification for mcp_ tools', async () => {
    const input = { tool: 'mcp_read' };

    await handler(input);

    expect(notify).toHaveBeenCalledWith('toolCompleted', '✓ OpenCode', 'read completed.', 'Blow');
  });

  it('does nothing for other tools', async () => {
    const input = { tool: 'question' };

    await handler(input);

    expect(notify).not.toHaveBeenCalled();
  });

  it('handles missing tool property in input', async () => {
    const input = {};

    await handler(input);

    expect(notify).not.toHaveBeenCalled();
  });
});
