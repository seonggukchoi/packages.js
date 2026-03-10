import { convertPatternToExact } from './convert-pattern-to-exact.helper';

describe('convertPatternToExact', () => {
  const pattern = '[0-9]+';

  it('should return pattern unchanged when exact is not set.', () => {
    expect(convertPatternToExact(pattern, {})).toBe(pattern);
  });

  it('should return pattern unchanged when exact is false.', () => {
    expect(convertPatternToExact(pattern, { exact: false })).toBe(pattern);
  });

  it('should add ^ and $ anchors when exact is true.', () => {
    expect(convertPatternToExact(pattern, { exact: true })).toBe(`^${pattern}$`);
  });

  it('should add only ^ anchor when exact.start is true.', () => {
    expect(convertPatternToExact(pattern, { exact: { start: true } })).toBe(`^${pattern}`);
  });

  it('should add only $ anchor when exact.end is true.', () => {
    expect(convertPatternToExact(pattern, { exact: { end: true } })).toBe(`${pattern}$`);
  });

  it('should add both anchors when exact.start and exact.end are true.', () => {
    expect(convertPatternToExact(pattern, { exact: { start: true, end: true } })).toBe(`^${pattern}$`);
  });

  it('should return pattern unchanged when exact object has both false.', () => {
    expect(convertPatternToExact(pattern, { exact: { start: false, end: false } })).toBe(pattern);
  });

  it('should return pattern unchanged when exact object is empty.', () => {
    expect(convertPatternToExact(pattern, { exact: {} })).toBe(pattern);
  });
});
