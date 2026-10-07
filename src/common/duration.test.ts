import { afterEach, describe, expect, it, vi } from 'vitest';
import { durationToSeconds } from './duration';

describe('durationToSeconds', () => {
  it('parses <number><unit>', () => {
    expect(durationToSeconds('30s')).toBe(30);
    expect(durationToSeconds('15m')).toBe(900);
    expect(durationToSeconds('1h')).toBe(3600);
    expect(durationToSeconds('7d')).toBe(604800);
  });

  it('rejects invalid formats', () => {
    for (const bad of ['abc', '10', '1w', 'h', '1.5h', '-1h', '0m', ' 1h', '']) {
      expect(durationToSeconds(bad), bad).toBeUndefined();
    }
  });
});

describe('config JWT_EXPIRES_IN', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('exposes expiresInSeconds', async () => {
    vi.stubEnv('JWT_EXPIRES_IN', '15m');
    vi.resetModules();
    const { config } = await import('../config');
    expect(config.jwt.expiresInSeconds).toBe(900);
    expect(config.jwt.issuer).toBe('ats-backend');
    expect(config.jwt.audience).toBe('ats-api');
  });

  it.each(['abc', '10'])('refuses to start with JWT_EXPIRES_IN=%s', async (value) => {
    vi.stubEnv('JWT_EXPIRES_IN', value);
    vi.resetModules();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);

    await expect(import('../config')).rejects.toThrow('exit:1');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('JWT_EXPIRES_IN'));
  });
});
