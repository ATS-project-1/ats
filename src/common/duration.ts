const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 } as const;

/** Converts "<number><unit>" (unit: s, m, h or d, e.g. "15m", "1h", "7d") to seconds. */
export function durationToSeconds(value: string): number | undefined {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return undefined;
  const seconds = Number(match[1]) * UNIT_SECONDS[match[2] as keyof typeof UNIT_SECONDS];
  return seconds > 0 ? seconds : undefined;
}
