/** A source of uniform numbers in [0, 1), like Math.random. */
export type Rng = () => number;

/**
 * mulberry32: a tiny seeded PRNG. The same seed on the same graph replays the
 * same walk, so an oracle answer can be reproduced from `seed` + vocabulary.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh unsigned 32-bit seed. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
