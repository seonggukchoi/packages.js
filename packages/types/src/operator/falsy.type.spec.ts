import { expectTypeOf } from 'vitest';

import type { Falsy } from './falsy.type';

/* eslint-disable vitest/expect-expect */
describe('Falsy', () => {
  it('should return true for falsy types.', () => {
    expectTypeOf<Falsy<false>>().toEqualTypeOf<true>();
    expectTypeOf<Falsy<0>>().toEqualTypeOf<true>();
    expectTypeOf<Falsy<''>>().toEqualTypeOf<true>();
    expectTypeOf<Falsy<null>>().toEqualTypeOf<true>();
    expectTypeOf<Falsy<undefined>>().toEqualTypeOf<true>();
    expectTypeOf<Falsy<void>>().toEqualTypeOf<true>();
    // Falsy<never> evaluates to never (conditional on never distributes to never)
  });

  it('should return false for truthy types.', () => {
    expectTypeOf<Falsy<true>>().toEqualTypeOf<false>();
    expectTypeOf<Falsy<1>>().toEqualTypeOf<false>();
    expectTypeOf<Falsy<'hello'>>().toEqualTypeOf<false>();
    expectTypeOf<Falsy<object>>().toEqualTypeOf<false>();
    expectTypeOf<Falsy<[]>>().toEqualTypeOf<false>();
  });
});
