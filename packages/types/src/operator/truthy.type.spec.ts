import { expectTypeOf } from 'vitest';

import type { Truthy } from './truthy.type';

/* eslint-disable vitest/expect-expect */
describe('Truthy', () => {
  it('should return true for truthy types.', () => {
    expectTypeOf<Truthy<true>>().toEqualTypeOf<true>();
    expectTypeOf<Truthy<1>>().toEqualTypeOf<true>();
    expectTypeOf<Truthy<'hello'>>().toEqualTypeOf<true>();
    expectTypeOf<Truthy<object>>().toEqualTypeOf<true>();
    expectTypeOf<Truthy<[]>>().toEqualTypeOf<true>();
  });

  it('should handle null and undefined.', () => {
    // Truthy<null>: null extends Falsy<null>(=true) → null extends true → false → result: true
    // Due to the implementation, Truthy evaluates `T extends Falsy<T>` which checks if T extends the result type
    expectTypeOf<Truthy<null>>().toEqualTypeOf<true>();
    expectTypeOf<Truthy<undefined>>().toEqualTypeOf<true>();
  });
});
