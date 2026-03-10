import { expectTypeOf } from 'vitest';

import type { Equal } from './equal.type';

/* eslint-disable vitest/expect-expect */
describe('Equal', () => {
  it('should return true for identical types.', () => {
    expectTypeOf<Equal<string, string>>().toEqualTypeOf<true>();
    expectTypeOf<Equal<number, number>>().toEqualTypeOf<true>();
    expectTypeOf<Equal<boolean, boolean>>().toEqualTypeOf<true>();
  });

  it('should return false for different types.', () => {
    expectTypeOf<Equal<string, number>>().toEqualTypeOf<false>();
    expectTypeOf<Equal<boolean, string>>().toEqualTypeOf<false>();
  });

  it('should distinguish between literal types and their base types.', () => {
    expectTypeOf<Equal<'hello', string>>().toEqualTypeOf<false>();
    expectTypeOf<Equal<42, number>>().toEqualTypeOf<false>();
    expectTypeOf<Equal<true, boolean>>().toEqualTypeOf<false>();
  });

  it('should return true for identical literal types.', () => {
    expectTypeOf<Equal<'hello', 'hello'>>().toEqualTypeOf<true>();
    expectTypeOf<Equal<42, 42>>().toEqualTypeOf<true>();
  });
});
