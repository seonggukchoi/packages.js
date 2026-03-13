import { expectTypeOf } from 'vitest';

import type { Uuid } from './uuid.type';

/* eslint-disable vitest/expect-expect */
describe('Uuid', () => {
  it('should accept valid UUID-like template literal strings.', () => {
    expectTypeOf<'550e8400-e29b-41d4-a716-446655440000'>().toMatchTypeOf<Uuid>();
  });

  it('should accept any string matching the template pattern.', () => {
    expectTypeOf<'a-b-c-d-e'>().toMatchTypeOf<Uuid>();
  });
});
