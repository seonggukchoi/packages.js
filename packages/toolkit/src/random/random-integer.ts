import { randomBytes } from 'node:crypto';

const BITS_PER_BYTE = 8n;

/**
 * Draws uniformly from `[0, span)`.
 *
 * Reducing a random byte string into a range with a modulo skews the result towards
 * the low end whenever the range is not a power of two. Discarding out-of-range draws
 * instead keeps every value equally likely. The span always covers more than half of
 * its bit width, so a draw is accepted with probability above 0.5 and the expected
 * number of attempts stays below two.
 */
const drawBelow = (span: bigint): bigint => {
  const bitLength = BigInt(span.toString(2).length);
  const byteLength = Number((bitLength + BITS_PER_BYTE - 1n) / BITS_PER_BYTE);
  const discardedBits = BigInt(byteLength) * BITS_PER_BYTE - bitLength;

  for (;;) {
    const candidate = BigInt(`0x${randomBytes(byteLength).toString('hex')}`) >> discardedBits;

    if (candidate < span) {
      return candidate;
    }
  }
};

/**
 * Draws uniformly from `[minimum, maximum)` using a cryptographically secure source.
 *
 * Unlike `crypto.randomInt` the range is unbounded, and unlike a `Number` the result
 * keeps full precision beyond `Number.MAX_SAFE_INTEGER`.
 *
 * @throws {RangeError} when `maximum` is not above `minimum`.
 */
export const randomBigInt = (minimum: bigint, maximum: bigint): bigint => {
  if (maximum <= minimum) {
    throw new RangeError('The maximum must be greater than the minimum.');
  }

  return minimum + drawBelow(maximum - minimum);
};
