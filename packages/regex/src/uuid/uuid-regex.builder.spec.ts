import { UUID_VERSION } from './constants';
import { InvalidUuidVersionException } from './exceptions';
import { buildUuidRegex } from './uuid-regex.builder';

describe('buildUuidRegex', () => {
  describe('should build a valid regex for each UUID version', () => {
    const sampleUuids: Record<string, string> = {
      [UUID_VERSION.V1]: '550e8400-e29b-11d4-a716-446655440000',
      [UUID_VERSION.V2]: '550e8400-e29b-21d4-a716-446655440000',
      [UUID_VERSION.V3]: '550e8400-e29b-3dd4-a716-446655440000',
      [UUID_VERSION.V4]: '550e8400-e29b-41d4-a716-446655440000',
      [UUID_VERSION.V5]: '550e8400-e29b-51d4-a716-446655440000',
      [UUID_VERSION.V6]: '550e8400-e29b-61d4-a716-446655440000',
      [UUID_VERSION.V7]: '550e8400-e29b-71d4-a716-446655440000',
      [UUID_VERSION.V8]: '550e8400-e29b-81d4-a716-446655440000',
      [UUID_VERSION.NIL]: '00000000-0000-0000-0000-000000000000',
      [UUID_VERSION.MAX]: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      [UUID_VERSION.ALL]: '550e8400-e29b-41d4-a716-446655440000',
    };

    it.each(Object.values(UUID_VERSION))('should build regex for version %s.', (version) => {
      const regex = buildUuidRegex({ version });

      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.test(sampleUuids[version])).toBe(true);
    });
  });

  it('should reject non-matching UUID for a specific version.', () => {
    const v4Regex = buildUuidRegex({ version: UUID_VERSION.V4, exact: true });

    expect(v4Regex.test('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
  });

  it('should support exact matching.', () => {
    const regex = buildUuidRegex({ version: UUID_VERSION.V4, exact: true });

    expect(regex.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(regex.test('prefix-550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('should support partial exact matching with start only.', () => {
    const regex = buildUuidRegex({ version: UUID_VERSION.V4, exact: { start: true } });

    expect(regex.test('550e8400-e29b-41d4-a716-446655440000-suffix')).toBe(true);
    expect(regex.test('prefix-550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('should support caseSensitive flag.', () => {
    const regex = buildUuidRegex({ version: UUID_VERSION.V4, caseSensitive: true });

    expect(regex.flags).toContain('i');
    expect(regex.test('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('should support global flag.', () => {
    const regex = buildUuidRegex({ version: UUID_VERSION.V4, global: true });

    expect(regex.flags).toContain('g');
  });

  it('should throw InvalidUuidVersionException for invalid version.', () => {
    expect(() => buildUuidRegex({ version: 'invalid' as never })).toThrow(InvalidUuidVersionException);
    expect(() => buildUuidRegex({ version: 'invalid' as never })).toThrow('Invalid UUID version: invalid');
  });
});
