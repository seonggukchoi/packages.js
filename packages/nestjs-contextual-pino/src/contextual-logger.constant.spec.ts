import { CONTEXTUAL_LOGGER_DECORATOR } from './contextual-logger.constant';

describe('CONTEXTUAL_LOGGER_DECORATOR', () => {
  it('should be a Symbol', () => {
    expect(typeof CONTEXTUAL_LOGGER_DECORATOR).toBe('symbol');
  });

  it('should have the description "CONTEXTUAL_LOGGER_DECORATOR"', () => {
    expect(CONTEXTUAL_LOGGER_DECORATOR.description).toBe('CONTEXTUAL_LOGGER_DECORATOR');
  });
});
