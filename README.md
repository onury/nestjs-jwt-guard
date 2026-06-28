# nestjs-jwt-guard

<p align="center">
  <a href="https://github.com/onury/nestjs-jwt-guard/actions/workflows/ci.yml"><img src="https://github.com/onury/nestjs-jwt-guard/actions/workflows/ci.yml/badge.svg" alt="build" /></a>
  <a href="#"><img src="https://img.shields.io/badge/coverage-100%25-2BB150?logo=vitest&logoColor=%23FDC72B&style=flat" alt="coverage" /></a>
  <a href="https://stryker-mutator.io/"><img src="https://img.shields.io/badge/mutation-100%25-2BB150?style=flat" alt="mutation score" /></a>
  <a href="https://www.npmjs.com/package/nestjs-jwt-guard"><img src="https://img.shields.io/npm/v/nestjs-jwt-guard.svg?style=flat&label=&color=%23C6234B&logo=npm" alt="version" /></a>
  <a href="https://gist.github.com/onury/d3f3d765d7db2e8b2d050d14315f2ac7"><img src="https://img.shields.io/badge/ESM-F7DF1E?style=flat" alt="ESM" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TS-3260C7?style=flat" alt="TypeScript" /></a>
  <a href="https://github.com/onury/nestjs-jwt-guard/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat" alt="license" /></a>
</p>

**Passport-free** bearer-token authentication for [NestJS](https://nestjs.com), built on the official [`@nestjs/jwt`](https://github.com/nestjs/jwt): a configurable guard, `@Public()`, and a token-issuance helper — wired with a single `forRoot()`.

> **ESM-only.** Requires Node ≥ 20 and NestJS 10 / 11.
>
> This is the **bearer-token** half (verify + issue). For username/password login (user lookup + password hashing), pair it with the token-agnostic credentials companion (`nestjs-credentials`).

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

- [**nestjs-accesscontrol**](https://github.com/onury/nestjs-accesscontrol) — The official NestJS integration for AccessControl v3: RBAC + ABAC with fluent CRUD decorators and attribute filtering.
- [**nestjs-http-envelope**](https://github.com/onury/nestjs-http-envelope) — A uniform, configurable response & error envelope for NestJS.
- [**nestjs-configuard**](https://github.com/onury/nestjs-configuard) — The NestJS integration for configuard: DB-backed, typed, ABAC-filtered runtime config.
- [**accesscontrol**](https://github.com/onury/accesscontrol) — Role & attribute-based access control (RBAC + ABAC) for Node.js.
- [**configuard**](https://github.com/onury/configuard) — Turn flat config rows from a database table into a nested, typed configuration object.

## License

[MIT](./LICENSE) © Onur Yıldırım
