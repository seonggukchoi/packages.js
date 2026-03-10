import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createVitestConfig } from '../../vitest.config.mjs';

export default createVitestConfig(dirname(fileURLToPath(import.meta.url)));
