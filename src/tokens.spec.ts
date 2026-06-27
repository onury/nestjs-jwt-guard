import { describe, expect, it } from 'vitest';
import { JWT_AUTH_OPTIONS } from './tokens';

describe('tokens', () => {
  it('JWT_AUTH_OPTIONS is a symbol', () => {
    expect(typeof JWT_AUTH_OPTIONS).toBe('symbol');
  });
});
