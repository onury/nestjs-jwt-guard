import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtAuthModule } from './jwt-auth.module';
import { JwtAuthService } from './jwt-auth.service';
import { JWT_AUTH_OPTIONS } from './tokens';

function providerFor(mod: { providers?: any[] }, token: unknown): any {
  return (mod.providers ?? []).find((p) => p?.provide === token);
}

describe('JwtAuthModule.forRoot', () => {
  it('wires JwtModule, options, guard, service, and a global guard', () => {
    const mod = JwtAuthModule.forRoot({ jwt: { secret: 's' } });
    expect(mod.module).toBe(JwtAuthModule);
    expect(mod.global).toBe(true);
    expect(mod.imports?.[0]).toMatchObject({ module: JwtModule });
    expect(mod.providers).toContain(JwtAuthGuard);
    expect(mod.providers).toContain(JwtAuthService);
    expect(providerFor(mod, JWT_AUTH_OPTIONS).useValue.attachTo).toBe('user');
    expect(providerFor(mod, APP_GUARD).useExisting).toBe(JwtAuthGuard);
    expect(mod.exports).toEqual([JwtAuthGuard, JwtAuthService, JWT_AUTH_OPTIONS, JwtModule]);
  });

  it('skips the global guard when registerGuard is false', () => {
    const mod = JwtAuthModule.forRoot({ jwt: { secret: 's' }, registerGuard: false });
    expect(providerFor(mod, APP_GUARD)).toBeUndefined();
  });

  it('honors isGlobal: false and behavior overrides', () => {
    const mod = JwtAuthModule.forRoot({
      jwt: { secret: 's' },
      isGlobal: false,
      attachTo: 'principal'
    });
    expect(mod.global).toBe(false);
    expect(providerFor(mod, JWT_AUTH_OPTIONS).useValue.attachTo).toBe('principal');
  });
});

describe('JwtAuthModule.forRootAsync', () => {
  it('wires JwtModule (async), guard, service, and a global guard', () => {
    const mod = JwtAuthModule.forRootAsync({ useFactory: () => ({ secret: 's' }) });
    expect(mod.global).toBe(true);
    expect(mod.imports?.[0]).toMatchObject({ module: JwtModule });
    expect(mod.providers).toContain(JwtAuthGuard);
    expect(providerFor(mod, APP_GUARD).useExisting).toBe(JwtAuthGuard);
    expect(mod.exports).toContain(JwtAuthService);
  });

  it('respects registerGuard: false', () => {
    const mod = JwtAuthModule.forRootAsync({
      useFactory: () => ({ secret: 's' }),
      registerGuard: false
    });
    expect(providerFor(mod, APP_GUARD)).toBeUndefined();
  });

  it('forwards useFactory and defaults imports/inject to [] in JwtModule.registerAsync', () => {
    const spy = vi.spyOn(JwtModule, 'registerAsync');
    const useFactory = () => ({ secret: 's' });
    JwtAuthModule.forRootAsync({ useFactory });
    expect(spy).toHaveBeenCalledWith({ imports: [], inject: [], useFactory });
  });

  it('passes imports/inject through to JwtModule.registerAsync', () => {
    const spy = vi.spyOn(JwtModule, 'registerAsync');
    const useFactory = () => ({ secret: 's' });
    class Imp {}
    const Dep = Symbol('Dep');
    JwtAuthModule.forRootAsync({ imports: [Imp], inject: [Dep], useFactory });
    expect(spy).toHaveBeenCalledWith({ imports: [Imp], inject: [Dep], useFactory });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
