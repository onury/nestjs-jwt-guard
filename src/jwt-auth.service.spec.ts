import { describe, expect, it, vi } from 'vitest';
import { JwtAuthService } from './jwt-auth.service';

describe('JwtAuthService', () => {
  it('signs a payload (with options) via JwtService', async () => {
    const jwt = { signAsync: vi.fn().mockResolvedValue('signed') };
    const svc = new JwtAuthService(jwt as never);
    const payload = { sub: 'u1' };
    const options = { expiresIn: 3600 };
    await expect(svc.sign(payload, options)).resolves.toBe('signed');
    expect(jwt.signAsync).toHaveBeenCalledWith(payload, options);
  });

  it('signs without options', async () => {
    const jwt = { signAsync: vi.fn().mockResolvedValue('s') };
    await new JwtAuthService(jwt as never).sign({ sub: 'u1' });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1' }, undefined);
  });
});
