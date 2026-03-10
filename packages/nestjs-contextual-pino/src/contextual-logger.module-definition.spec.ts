import { ConfigurableContextualPinoModule, CONTEXTUAL_LOGGER_MODULE_OPTIONS_TOKEN } from './contextual-logger.module-definition';

describe('contextual-logger.module-definition', () => {
  it('should export ConfigurableContextualPinoModule as a class', () => {
    expect(ConfigurableContextualPinoModule).toBeDefined();
    expect(typeof ConfigurableContextualPinoModule).toBe('function');
  });

  it('should export CONTEXTUAL_LOGGER_MODULE_OPTIONS_TOKEN', () => {
    expect(CONTEXTUAL_LOGGER_MODULE_OPTIONS_TOKEN).toBeDefined();
  });
});
