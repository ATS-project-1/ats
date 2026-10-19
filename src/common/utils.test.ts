import { describe, expect, it } from 'vitest';
import { chunkArray } from './utils';

describe('chunkArray', () => {
  it('splits arrays into chunks and preserves all values', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkArray([], 2)).toEqual([]);
  });

  it('rejects non-positive or non-integer chunk sizes', () => {
    expect(() => chunkArray([1], 0)).toThrow(RangeError);
    expect(() => chunkArray([1], 1.5)).toThrow(RangeError);
  });
});
