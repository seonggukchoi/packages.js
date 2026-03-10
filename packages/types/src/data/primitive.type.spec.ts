import { expectTypeOf } from 'vitest';

import type { Primitive } from './primitive.type';

/* eslint-disable vitest/expect-expect */
describe('Primitive', () => {
  it('should include all primitive types.', () => {
    expectTypeOf<string>().toMatchTypeOf<Primitive>();
    expectTypeOf<number>().toMatchTypeOf<Primitive>();
    expectTypeOf<boolean>().toMatchTypeOf<Primitive>();
    expectTypeOf<bigint>().toMatchTypeOf<Primitive>();
    expectTypeOf<symbol>().toMatchTypeOf<Primitive>();
    expectTypeOf<null>().toMatchTypeOf<Primitive>();
    expectTypeOf<undefined>().toMatchTypeOf<Primitive>();
  });

  it('should not include object types.', () => {
    expectTypeOf<object>().not.toMatchTypeOf<Primitive>();
    expectTypeOf<[]>().not.toMatchTypeOf<Primitive>();
  });
});
