import { expectTypeOf } from 'vitest';

import type { Primitive } from '../data';
import type { DeepSimilarObject } from './deep-similar-object.type';

/* eslint-disable vitest/expect-expect */
describe('DeepSimilarObject', () => {
  it('should map primitive properties to Primitive type.', () => {
    interface User {
      name: string;
      age: number;
    }

    type Result = DeepSimilarObject<User>;

    expectTypeOf<Result>().toEqualTypeOf<{ name: Primitive; age: Primitive }>();
  });

  it('should recursively map nested objects.', () => {
    interface Nested {
      child: {
        value: string;
      };
    }

    type Result = DeepSimilarObject<Nested>;

    expectTypeOf<Result>().toEqualTypeOf<{ child: { value: Primitive } }>();
  });

  it('should handle Array properties.', () => {
    interface WithArray {
      items: Array<{ name: string }>;
    }

    type Result = DeepSimilarObject<WithArray>;

    expectTypeOf<Result>().toEqualTypeOf<{ items: Array<{ name: Primitive }> }>();
  });

  it('should handle ReadonlyArray properties.', () => {
    interface WithReadonlyArray {
      items: ReadonlyArray<{ name: string }>;
    }

    type Result = DeepSimilarObject<WithReadonlyArray>;

    expectTypeOf<Result>().toEqualTypeOf<{ items: ReadonlyArray<{ name: Primitive }> }>();
  });
});
