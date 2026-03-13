import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import swc from 'unplugin-swc';
import { mergeConfig } from 'vitest/config';

import { createVitestConfig } from '../../vitest.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default mergeConfig(createVitestConfig(__dirname), {
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          decoratorMetadata: true,
          legacyDecorator: true,
        },
      },
    }),
  ],
});
