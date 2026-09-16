vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock-home'),
}));

import { resolveCodexHome, resolvePluginDir } from './paths.js';

describe('resolveCodexHome', () => {
  beforeEach(() => {
    delete process.env.CODEX_HOME;
  });

  afterEach(() => {
    delete process.env.CODEX_HOME;
  });

  it('defaults to ~/.codex when CODEX_HOME is not set', () => {
    expect(resolveCodexHome()).toBe('/mock-home/.codex');
  });

  it('uses CODEX_HOME when it is set', () => {
    process.env.CODEX_HOME = '/custom/codex-home';

    expect(resolveCodexHome()).toBe('/custom/codex-home');
  });

  it('ignores an empty CODEX_HOME like Codex does', () => {
    process.env.CODEX_HOME = '';

    expect(resolveCodexHome()).toBe('/mock-home/.codex');
  });
});

describe('resolvePluginDir', () => {
  afterEach(() => {
    delete process.env.CODEX_HOME;
  });

  it('places the plugin directory under the Codex plugins directory', () => {
    delete process.env.CODEX_HOME;

    expect(resolvePluginDir()).toBe('/mock-home/.codex/plugins/codex-notifier');
  });

  it('follows CODEX_HOME', () => {
    process.env.CODEX_HOME = '/custom/codex-home';

    expect(resolvePluginDir()).toBe('/custom/codex-home/plugins/codex-notifier');
  });
});
