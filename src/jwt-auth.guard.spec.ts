import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard';
import { type JwtAuthGuardBehavior, resolveGuardOptions } from './options';
import { Public } from './public.decorator';

class Ctrl {
  secured() {}
  @Public() open() {}
}

function ctx(handler: unknown, request: unknown) {
  return {
    getHandler: () => handler,
    getClass: () => Ctrl,
    switchToHttp: () => ({ getRequest: () => request })
  } as never;
}

function makeGuard(verify: (...a: unknown[]) => unknown, behavior: JwtAuthGuardBehavior = {}) {
  const jwt = { verifyAsync: vi.fn(verify) };
  const guard = new JwtAuthGuard(jwt as never, new Reflector(), resolveGuardOptions(behavior));
  return { guard, jwt };
}

const bearer = (t: string) => ({ headers: { authorization: `Bearer ${t}` } });

describe('JwtAuthGuard', () => {
  it('allows @Public() routes without a token', async () => {
    const { guard, jwt } = makeGuard(() => ({}));
    await expect(guard.canActivate(ctx(Ctrl.prototype.open, {}))).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects when no token is present', async () => {
    const { guard, jwt } = makeGuard(() => ({}));
    await expect(
      guard.canActivate(ctx(Ctrl.prototype.secured, { headers: {} }))
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('verifies the token and attaches the payload to req.user', async () => {
    const payload = { sub: 'u1', role: 'admin' };
    const { guard, jwt } = makeGuard(() => payload);
    const req: Record<string, unknown> = bearer('tok');
    await expect(guard.canActivate(ctx(Ctrl.prototype.secured, req))).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('tok', undefined);
    expect(req.user).toBe(payload);
  });

  it('rejects an invalid / expired token', async () => {
    const { guard } = makeGuard(() => {
      throw new Error('bad signature');
    });
    await expect(
      guard.canActivate(ctx(Ctrl.prototype.secured, bearer('x')))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid token before validate runs (even if validate would accept)', async () => {
    const validate = vi.fn(() => ({ ok: true }));
    const { guard } = makeGuard(
      () => {
        throw new Error('bad signature');
      },
      { validate }
    );
    await expect(
      guard.canActivate(ctx(Ctrl.prototype.secured, bearer('x')))
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(validate).not.toHaveBeenCalled();
  });

  it.each([null, undefined])('rejects when validate returns %s', async (ret) => {
    const { guard } = makeGuard(() => ({ sub: 'u' }), { validate: () => ret });
    await expect(
      guard.canActivate(ctx(Ctrl.prototype.secured, bearer('x')))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps the principal via a custom validate and attaches to a custom property', async () => {
    const { guard } = makeGuard(() => ({ sub: 'u1' }), {
      validate: (p) => ({ id: (p as { sub: string }).sub }),
      attachTo: 'principal'
    });
    const req: Record<string, unknown> = bearer('x');
    await guard.canActivate(ctx(Ctrl.prototype.secured, req));
    expect(req.principal).toEqual({ id: 'u1' });
    expect(req.user).toBeUndefined();
  });

  it('propagates a custom validate error untouched', async () => {
    const { guard } = makeGuard(() => ({ sub: 'u' }), {
      validate: () => {
        throw new ForbiddenException('nope');
      }
    });
    await expect(
      guard.canActivate(ctx(Ctrl.prototype.secured, bearer('x')))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forwards verifyOptions and uses a custom token extractor', async () => {
    const verifyOptions = { audience: 'api' };
    const { guard, jwt } = makeGuard(() => ({ sub: 'u' }), {
      verifyOptions,
      getToken: (r) => (r as { query?: { access_token?: string } }).query?.access_token
    });
    await guard.canActivate(ctx(Ctrl.prototype.secured, { query: { access_token: 'qtok' } }));
    expect(jwt.verifyAsync).toHaveBeenCalledWith('qtok', verifyOptions);
  });
});
