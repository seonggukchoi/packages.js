import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const pluginPath = join(root, '.claude-plugin/plugin.json');
const plugin = JSON.parse(readFileSync(pluginPath, 'utf8'));

plugin.version = pkg.version;
writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + '\n');
