import { describe, expect, it } from 'vitest';
import { toSkipTake } from './pagination';

describe('toSkipTake', () => {
  it('uses page 1 and pageSize 20 by default', () => {
    expect(toSkipTake({})).toEqual({ skip: 0, take: 20, page: 1, pageSize: 20 });
  });

  it('clamps page below 1 to 1', () => {
    expect(toSkipTake({ page: 0, pageSize: 10 }).page).toBe(1);
    expect(toSkipTake({ page: -5, pageSize: 10 })).toMatchObject({ page: 1, skip: 0 });
  });

  it('clamps pageSize to 1..100', () => {
    expect(toSkipTake({ page: 1, pageSize: 0 }).pageSize).toBe(1);
    expect(toSkipTake({ page: 1, pageSize: -3 }).pageSize).toBe(1);
    expect(toSkipTake({ page: 1, pageSize: 1000 }).pageSize).toBe(100);
    expect(toSkipTake({ page: 1, pageSize: 100 }).pageSize).toBe(100);
  });

  it('falls back to defaults for non-finite values', () => {
    expect(toSkipTake({ page: NaN, pageSize: NaN })).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('computes skip as (page - 1) * pageSize', () => {
    expect(toSkipTake({ page: 3, pageSize: 25 })).toEqual({
      skip: 50,
      take: 25,
      page: 3,
      pageSize: 25,
    });
  });
});
