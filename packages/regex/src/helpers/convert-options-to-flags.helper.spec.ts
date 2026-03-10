import { convertOptionsToFlags } from './convert-options-to-flags.helper';

describe('convertOptionsToFlags', () => {
  it('should return empty string when no options are enabled.', () => {
    expect(convertOptionsToFlags({})).toBe('');
  });

  it('should return "i" when caseSensitive is true.', () => {
    expect(convertOptionsToFlags({ caseSensitive: true })).toBe('i');
  });

  it('should return "g" when global is true.', () => {
    expect(convertOptionsToFlags({ global: true })).toBe('g');
  });

  it('should return "ig" when both caseSensitive and global are true.', () => {
    expect(convertOptionsToFlags({ caseSensitive: true, global: true })).toBe('ig');
  });

  it('should return empty string when caseSensitive is false.', () => {
    expect(convertOptionsToFlags({ caseSensitive: false })).toBe('');
  });

  it('should return empty string when global is false.', () => {
    expect(convertOptionsToFlags({ global: false })).toBe('');
  });

  it('should return empty string when both options are false.', () => {
    expect(convertOptionsToFlags({ caseSensitive: false, global: false })).toBe('');
  });
});
