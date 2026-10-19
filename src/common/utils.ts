export const chunkArray = <T>(arr: T[], size: number): T[][] => {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError('Chunk size must be a positive integer');
  }
  return arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];
};
