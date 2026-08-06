import { randomBytes } from 'node:crypto';

import { randomBigInt } from './random-integer.js';

type SyncRandomBytes = (size: number) => Buffer;

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();

  return { ...actual, randomBytes: vi.fn(actual.randomBytes) };
});

const mockedRandomBytes = vi.mocked(randomBytes as SyncRandomBytes);

const SAMPLES = 30_000;
// Three outcomes leave 2 degrees of freedom; a uniform draw exceeds 13.82 with
// probability 0.001, so a value above it means the distribution is skewed. Folding
// out-of-range draws back into the span instead of discarding them would put half the
// mass on a single value here, which lands orders of magnitude above the threshold.
const CHI_SQUARE_CRITICAL = 13.82;

const chiSquare = (counts: number[], samples: number): number => {
  const expected = samples / counts.length;

  return counts.reduce((total, count) => total + (count - expected) ** 2 / expected, 0);
};

describe('randomBigInt', () => {
  it('should stay inside the requested range', () => {
    for (let i = 0; i < 10_000; i++) {
      const value = randomBigInt(-5n, 5n);

      expect(value).toBeGreaterThanOrEqual(-5n);
      expect(value).toBeLessThan(5n);
    }
  });

  it('should draw uniformly when the span is not a power of two', () => {
    const counts = [0, 0, 0];

    for (let i = 0; i < SAMPLES; i++) {
      counts[Number(randomBigInt(0n, 3n))]++;
    }

    expect(chiSquare(counts, SAMPLES)).toBeLessThan(CHI_SQUARE_CRITICAL);
  });

  it('should return the only value a span of one allows', () => {
    expect(randomBigInt(7n, 8n)).toBe(7n);
  });

  it('should span a range wider than crypto.randomInt accepts', () => {
    const minimum = BigInt(Number.MIN_SAFE_INTEGER);
    const maximum = BigInt(Number.MAX_SAFE_INTEGER);

    for (let i = 0; i < 1_000; i++) {
      const value = randomBigInt(minimum, maximum);

      expect(value).toBeGreaterThanOrEqual(minimum);
      expect(value).toBeLessThan(maximum);
      expect(Number.isSafeInteger(Number(value))).toBe(true);
    }
  });

  it('should keep full precision beyond Number.MAX_SAFE_INTEGER', () => {
    const minimum = 10n ** 30n;
    const maximum = minimum + 10n;

    const value = randomBigInt(minimum, maximum);

    expect(value).toBeGreaterThanOrEqual(minimum);
    expect(value).toBeLessThan(maximum);
  });

  it('should discard a draw that lands outside the span', () => {
    // A span of 3 occupies the top 2 bits of the drawn byte. 0b11 is drawable but out
    // of range, so it has to be discarded rather than folded onto a valid value.
    mockedRandomBytes.mockReturnValueOnce(Buffer.from([0b1100_0000]));
    mockedRandomBytes.mockReturnValueOnce(Buffer.from([0b0100_0000]));

    expect(randomBigInt(0n, 3n)).toBe(1n);
    expect(mockedRandomBytes).toHaveBeenCalledTimes(2);
  });

  it('should reject a maximum that is not above the minimum', () => {
    expect(() => randomBigInt(5n, 5n)).toThrow(RangeError);
    expect(() => randomBigInt(9n, 5n)).toThrow(RangeError);
  });
});
