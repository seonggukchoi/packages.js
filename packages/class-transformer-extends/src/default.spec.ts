import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';

import { Default } from './default';

class TestClass {
  @Default('defaultValue')
  value!: string;

  @Default(42)
  num!: number;

  @Default(false)
  flag!: boolean;
}

describe('Default', () => {
  it('should use the default value when the property is undefined.', () => {
    const result = plainToInstance(TestClass, { value: undefined, num: undefined, flag: undefined });

    expect(result.value).toBe('defaultValue');
    expect(result.num).toBe(42);
    expect(result.flag).toBe(false);
  });

  it('should use the default value when the property is null.', () => {
    const result = plainToInstance(TestClass, { value: null, num: null, flag: null });

    expect(result.value).toBe('defaultValue');
    expect(result.num).toBe(42);
    expect(result.flag).toBe(false);
  });

  it('should preserve the original value when it is provided.', () => {
    const result = plainToInstance(TestClass, { value: 'custom', num: 100, flag: true });

    expect(result.value).toBe('custom');
    expect(result.num).toBe(100);
    expect(result.flag).toBe(true);
  });

  it('should preserve falsy values that are not null or undefined.', () => {
    const result = plainToInstance(TestClass, { value: '', num: 0, flag: false });

    expect(result.value).toBe('');
    expect(result.num).toBe(0);
    expect(result.flag).toBe(false);
  });
});
