import { normalizeChatParams } from './params.js';
import { getClaudeCodeSystemNote } from './system.js';

import type { Plugin } from '@opencode-ai/plugin';

export const ClaudeCodePlugin: Plugin = async () => {
  return {
    'chat.params': async (input, output) => {
      normalizeChatParams(input, output);
    },
    'experimental.chat.system.transform': async (input, output) => {
      if (input.model?.providerID !== 'claude-code') {
        return;
      }

      output.system.push(getClaudeCodeSystemNote());
    },
  };
};
