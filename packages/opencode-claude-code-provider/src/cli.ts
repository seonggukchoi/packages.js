import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';

import { mapCliMessage, type StreamState } from './messages.js';
import { processTextBuffer } from './tool-call-parser.js';
import { isRecord } from './types.js';

import type { ToolCallTextState } from './tool-call-parser.js';
import type { LanguageModelV3StreamPart } from '@ai-sdk/provider';
import type { WriteStream } from 'node:fs';

export function buildCliArgs(options: {
  effort?: string;
  maxTurns: number;
  model: string;
  resumeSessionId?: string;
  sessionId?: string;
  system?: string;
}): string[] {
  return [
    '-p',
    '--verbose',
    '--tools',
    '',
    '--strict-mcp-config',
    '--input-format',
    'text',
    '--output-format',
    'stream-json',
    '--include-partial-messages',
    '--max-turns',
    String(options.maxTurns),
    '--model',
    options.model,
    '--dangerously-skip-permissions',
    ...(options.effort ? ['--effort', options.effort] : []),
    ...(options.system ? ['--system-prompt', options.system] : []),
    ...(options.resumeSessionId ? ['--resume', options.resumeSessionId] : []),
    ...(options.sessionId && !options.resumeSessionId ? ['--session-id', options.sessionId] : []),
  ];
}

export async function streamCliProcess(options: {
  child: ReturnType<typeof spawn>;
  controller: ReadableStreamDefaultController<LanguageModelV3StreamPart>;
  logFile?: string;
  streamState: StreamState;
  textState: ToolCallTextState;
}): Promise<void> {
  const { child, controller, logFile, streamState, textState } = options;
  const stderrChunks: string[] = [];
  let toolCallDetected = false;
  let logStream: WriteStream | undefined;

  child.stderr?.on('data', (chunk) => {
    stderrChunks.push(chunk.toString());
  });

  const exitPromise = new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0 || toolCallDetected) {
        resolve();
        return;
      }

      const stderr = stderrChunks.join('').trim();
      const details =
        stderr.length > 0 ? stderr : `Claude CLI exited with code ${code ?? 'unknown'}${signal ? ` (signal: ${signal})` : ''}.`;

      reject(new Error(details));
    });
  });

  if (!child.stdout) {
    throw new Error('Claude CLI stdout is not available.');
  }

  /* v8 ignore start */
  if (logFile) {
    await mkdir(dirname(logFile), { recursive: true });
    logStream = createWriteStream(logFile, { flags: 'a' });
  }
  /* v8 ignore stop */

  const reader = createInterface({ input: child.stdout });

  try {
    for await (const line of reader) {
      if (line.trim().length === 0) {
        continue;
      }

      logStream?.write(line + '\n');

      const message = parseCliMessage(line);

      if (toolCallDetected) {
        mapCliMessage(message, streamState);
        continue;
      }

      const parts = mapCliMessage(message, streamState);

      for (const part of parts) {
        const processedParts = processTextBuffer(part, streamState, textState);

        for (const processedPart of processedParts) {
          controller.enqueue(processedPart);

          if (processedPart.type === 'tool-call') {
            toolCallDetected = true;
          }
        }
      }
    }

    if (toolCallDetected) {
      streamState.finishReason = 'tool-calls';
    }

    await exitPromise;
  } finally {
    reader.close();
    logStream?.end();
  }
}

export async function writePromptToCliProcess(child: ReturnType<typeof spawn>, prompt: string): Promise<void> {
  if (!child.stdin) {
    throw new Error('Claude CLI stdin is not available.');
  }

  const stdin = child.stdin;

  await new Promise<void>((resolve, reject) => {
    const handleError = (error: Error) => {
      stdin.off('finish', handleFinish);
      reject(error);
    };
    const handleFinish = () => {
      stdin.off('error', handleError);
      resolve();
    };

    stdin.once('error', handleError);
    stdin.once('finish', handleFinish);

    try {
      stdin.end(prompt);
    } catch (error) {
      stdin.off('error', handleError);
      stdin.off('finish', handleFinish);
      reject(error);
    }
  });
}

/* v8 ignore start */
function parseCliMessage(line: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(line);

    if (!isRecord(parsed)) {
      throw new Error('Claude CLI emitted a non-object JSON message.');
    }

    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse Claude CLI JSONL output: ${message}`);
  }
}
/* v8 ignore stop */
