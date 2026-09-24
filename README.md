# nestjs-jwt-guard

<p align="center">
  <a href="https://github.com/onury/nestjs-jwt-guard/actions/workflows/ci.yml"><img src="https://github.com/onury/nestjs-jwt-guard/actions/workflows/ci.yml/badge.svg" alt="build" /></a>
  <a href="#"><img src="https://img.shields.io/badge/coverage-100%25-2BB150?logo=vitest&logoColor=%23FDC72B&style=flat" alt="coverage" /></a>
  <a href="https://stryker-mutator.io/"><img src="https://img.shields.io/badge/mutation-100%25-2BB150?style=flat" alt="mutation score" /></a>
  <a href="https://www.npmjs.com/package/nestjs-jwt-guard"><img src="https://img.shields.io/npm/v/nestjs-jwt-guard.svg?style=flat&label=&color=%23C6234B&logo=npm" alt="version" /></a>
  <a href="https://img.shields.io/badge/deps-zero-2BB150"><img src="https://img.shields.io/badge/deps-zero-2BB150?style=flat" alt="zero dependencies" /></a>
  <a href="https://gist.github.com/onury/d3f3d765d7db2e8b2d050d14315f2ac7"><img src="https://img.shields.io/badge/ESM-F7DF1E?style=flat" alt="ESM" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TS-3260C7?style=flat" alt="TypeScript" /></a>
  <a href="https://github.com/onury/nestjs-jwt-guard/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat" alt="license" /></a>
</p>

Bearer-token authentication for [NestJS](https://nestjs.com), built on the official [`@nestjs/jwt`](https://github.com/nestjs/jwt): a configurable guard, `@Public()`, and a token-issuance helper — wired with a single `forRoot()`.

> 🔆 **[ESM](https://gist.github.com/onury/d3f3d765d7db2e8b2d050d14315f2ac7)-only.** Requires Node ≥ 20 and NestJS 10 / 11 / 12.
>
> This is the **bearer-token** half (verify + issue). For username/password login (user lookup + password hashing), pair it with the token-agnostic credentials companion (`nestjs-credentials`). For machine and third-party callers, see [Alongside nestjs-apikey-auth](#alongside-nestjs-apikey-auth); the two guards do not run together at their defaults.

## Install

```bash
npm install nestjs-jwt-guard @nestjs/jwt
```

`@nestjs/common`, `@nestjs/core`, and `reflect-metadata` are peer dependencies (already in any Nest app).

## Quick start

Register once — it configures `@nestjs/jwt` and registers the guard globally:

```ts
import { Module } from '@nestjs/common';
import { JwtAuthModule } from 'nestjs-jwt-guard';

@Module({
  imports: [
    JwtAuthModule.forRoot({
      jwt: { secret: process.env.JWT_SECRET, signOptions: { expiresIn: '15m' } },
    }),
  ],
})
export class AppModule {}
```

Every route now requires a valid `Authorization: Bearer <token>`. Mark exceptions with `@Public()`:

```ts
import { Public } from 'nestjs-jwt-guard';

@Public()
@Post('login')
login() { /* … */ }
```

**Issue tokens** with the injectable helper:

```ts
import { JwtAuthService } from 'nestjs-jwt-guard';

constructor(private readonly auth: JwtAuthService) {}

async login(user: User) {
  return { accessToken: await this.auth.sign({ sub: user.id, role: user.role }) };
}
```

**Read the principal** — the decoded payload is attached to `req.user` (configurable):

```ts
@Get('me')
me(@Req() req: AuthenticatedRequest) {
  return req.user; // { sub, role, … }
}
```

## DB-driven config (`forRootAsync`)

```ts
JwtAuthModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow('JWT_SECRET'),
    signOptions: { expiresIn: '15m' },
  }),
});
```

## Configuration

```ts
JwtAuthModule.forRoot({
  jwt: { /* @nestjs/jwt config — secret/keys, signOptions, … */ },
  getToken: (req) => req.headers.authorization?.slice(7), // default: Bearer header
  validate: (payload, req) => payload,                    // map/validate → req.user; null ⇒ 401
  attachTo: 'user',                                       // request property (default)
  verifyOptions: { audience: 'api' },                     // forwarded to verifyAsync
  registerGuard: true,                                    // register globally via APP_GUARD
  isGlobal: true,                                         // module is global
});
```

| Option | Default | Description |
| --- | --- | --- |
| `jwt` | — | `@nestjs/jwt` config, passed to `JwtModule.register` (required) |
| `getToken` | `Bearer` header | Extract the raw token from the request |
| `validate` | identity | Map/validate the decoded payload into the principal; return `null`/`undefined` ⇒ 401, or throw your own error |
| `attachTo` | `'user'` | Request property the principal is attached to |
| `verifyOptions` | — | Extra options forwarded to `JwtService.verifyAsync` |
| `registerGuard` | `true` | Register the guard globally via `APP_GUARD` |
| `isGlobal` | `true` | Register the module globally |

`validate` runs **outside** the verify try/catch, so a custom validator can throw its own (non-401) error and have it propagate untouched.

## Per-route use

Disable the global guard (`registerGuard: false`) and apply per-controller instead — the guard and `JwtService` are exported:

```ts
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {}
```

## Alongside nestjs-apikey-auth

[`nestjs-apikey-auth`](https://github.com/onury/nestjs-apikey-auth) covers machine and third-party callers. Both packages register their guard globally by default, and both read the `Authorization` header: this one expects `Bearer <jwt>`, the key guard expects `ApiKey <key>`. Nest runs every global guard and all of them must pass. A request carries one `Authorization` header, so with both modules at their defaults **no request gets through**.

Keep one guard global and bind the other per controller. If most of your API serves users; this guard is the global one and keys guard the machine routes:

```ts
import { Controller, Module, UseGuards } from '@nestjs/common';
import { JwtAuthModule, Public } from 'nestjs-jwt-guard';
import { ApiKeyGuard, ApiKeyModule } from 'nestjs-apikey-auth';

@Module({
  imports: [
    JwtAuthModule.forRoot({ jwt: { secret: process.env.JWT_SECRET } }), // global: every route needs a Bearer JWT
    ApiKeyModule.forRoot({
      store,                                                            // your ApiKeyStore
      registerGuard: false,                                             // not global; bound per controller
    }),
  ],
})
export class AppModule {}

@Public()                  // this package's @Public(): passes the global JWT guard
@UseGuards(ApiKeyGuard)    // this one demands the key
@Controller('machine')
export class MachineController {}
```

The machine controller needs **both** decorators. Without `@Public()`, the global JWT guard rejects the request with `401` before `ApiKeyGuard` ever sees the key. With `forRootAsync` (either module), `registerGuard` goes next to `useFactory`, not inside the object it returns.

If keys are the default (a machine-first API with a few user routes), mirror it: keep the key guard global, pass `registerGuard: false` here, and mark the user controllers with the key package's `@Public()`:

```ts
import { Controller, Module, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, JwtAuthModule } from 'nestjs-jwt-guard';
import { ApiKeyModule, Public } from 'nestjs-apikey-auth';

@Module({
  imports: [
    ApiKeyModule.forRoot({ store }),                              // global
    JwtAuthModule.forRoot({
      jwt: { secret: process.env.JWT_SECRET },
      registerGuard: false,                                       // not global; bound per controller
    }),
  ],
})
export class AppModule {}

@Public()                  // nestjs-apikey-auth's @Public(): passes the global key guard
@UseGuards(JwtAuthGuard)   // this one demands the JWT
@Controller('me')
export class MeController {}
```

**Two `@Public()` decorators.** Each package exports its own `@Public()` with its own metadata key, and each guard reads only its own. A route marked with one is still guarded by the other. Import the one that belongs to your global guard, and alias them when a file needs both. In the setups above an open route (login, health) only needs the global guard's `@Public()`; if both guards are global, it needs both. Marking both is harmless, and keeps the route open whichever guard ends up global:

```ts
import { Public as JwtPublic } from 'nestjs-jwt-guard';
import { Public as KeyPublic } from 'nestjs-apikey-auth';

@JwtPublic()
@KeyPublic()
@Post('login')
login() { /* … */ }
```

**`req.user`.** This guard writes the verified payload to `req.user` (`attachTo`). The key guard always attaches the key record at `req.apiKey`, and writes `req.user` only when its `resolvePrincipal` is configured. In the setups above no route runs both guards, so they never collide. If you do stack both on one route, Nest runs global guards first, then controller guards, then method guards; the one that runs last owns `req.user`. For example, with this guard global and `@UseGuards(ApiKeyGuard)` on the route, `req.user` ends up as the key's principal and the JWT payload is gone. Stacking also means the key has to come from another header (the key module's `header: 'X-Api-Key', scheme: ''`), since a request has one `Authorization` header. Set `attachTo` here to something else if you need both principals.

_Note: guards in Nest are AND-ed. Neither package lets a route accept "a JWT or a key"; for that, write a small guard of your own that tries one and falls back to the other._

## API

**Module**

| Export | Description |
| --- | --- |
| `JwtAuthModule.forRoot(options)` | Configure `@nestjs/jwt` (via `jwt`) + the guard synchronously. See [Configuration](#configuration). |
| `JwtAuthModule.forRootAsync(options)` | Build the `@nestjs/jwt` config from injected deps (`useFactory`). |

**Enforcement & issuance**

| Export | Description |
| --- | --- |
| `JwtAuthGuard` | The bearer-token guard. Registered globally by default; exported for per-route `@UseGuards`. |
| `JwtAuthService` | `sign(payload, options?)` — issue a token via the configured `JwtService`. |
| `@Public()` | Marks a route/controller as exempt from the guard. |
| `IS_PUBLIC_KEY` | The metadata key `@Public()` sets (for custom reflection). |

**Advanced & types**

| Export | Description |
| --- | --- |
| `JWT_AUTH_OPTIONS` | DI token holding the resolved guard behavior. |
| `resolveGuardOptions(behavior?)` | Merge behavior over the defaults → `ResolvedGuardOptions`. |
| `defaultGetToken`, `defaultValidate` | The default `Bearer`-header extractor and identity validator. |
| `JwtAuthOptions`, `JwtAuthAsyncOptions`, `JwtAuthGuardBehavior`, `ResolvedGuardOptions` | Option types. |
| `TokenExtractor`, `PayloadValidator`, `JwtPayload`, `AuthenticatedRequest` | Supporting types. |

## Related Projects

- [**nestjs-credentials**](https://github.com/onury/nestjs-credentials) — Token-agnostic username/password verification — a `UserStore` seam + pluggable `PasswordHasher`. Verify there, mint the JWT here.
- [**nestjs-apikey-auth**](https://github.com/onury/nestjs-apikey-auth) — API-key auth for machine and third-party callers: hashed-at-rest keys, scopes, instant revocation. To run both, see [Alongside nestjs-apikey-auth](#alongside-nestjs-apikey-auth).
- [**nestjs-oauth2-password**](https://github.com/onury/nestjs-oauth2-password) — The stateful OAuth2 ROPC alternative: opaque, server-stored, revocable access + refresh tokens with an RFC 6749 token endpoint.
- [**nestjs-accesscontrol**](https://github.com/onury/nestjs-accesscontrol) — The official NestJS integration for [AccessControl v3](https://github.com/onury/accesscontrol): RBAC + ABAC with fluent CRUD decorators and attribute filtering.
- [**nestjs-http-envelope**](https://github.com/onury/nestjs-http-envelope) — A uniform, configurable response & error envelope for NestJS.
- [**nestjs-configuard**](https://github.com/onury/nestjs-configuard) — The NestJS integration for [configuard](https://github.com/onury/configuard): DB-backed, typed, ABAC-filtered runtime config.
- [**accesscontrol**](https://github.com/onury/accesscontrol) — Role & attribute-based access control (RBAC + ABAC) for Node.js.
- [**configuard**](https://github.com/onury/configuard) — Turn flat config rows from a database table into a nested, typed configuration object.

## License

[MIT](./LICENSE) © Onur Yıldırım
