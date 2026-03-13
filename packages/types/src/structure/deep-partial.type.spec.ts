import { expectTypeOf } from 'vitest';

import type { DeepPartial } from './deep-partial.type';

/* eslint-disable vitest/expect-expect */
describe('DeepPartial', () => {
  it('should make all properties optional at the top level.', () => {
    interface User {
      name: string;
      age: number;
    }

    expectTypeOf<DeepPartial<User>>().toEqualTypeOf<{ name?: string; age?: number }>();
  });

  it('should make nested object properties optional recursively.', () => {
    interface Nested {
      a: {
        b: {
          c: string;
        };
      };
    }

    type Result = DeepPartial<Nested>;

    expectTypeOf<Result>().toEqualTypeOf<{ a?: { b?: { c?: string } } }>();
  });

  it('should handle arrays by making element properties optional.', () => {
    interface WithArray {
      items: Array<{ name: string }>;
    }

    type Result = DeepPartial<WithArray>;

    expectTypeOf<Result>().toEqualTypeOf<{ items?: Array<{ name?: string }> }>();
  });

  it('should handle readonly arrays.', () => {
    interface WithReadonlyArray {
      items: ReadonlyArray<{ name: string }>;
    }

    type Result = DeepPartial<WithReadonlyArray>;

    expectTypeOf<Result>().toEqualTypeOf<{ items?: ReadonlyArray<{ name?: string }> }>();
  });
});
