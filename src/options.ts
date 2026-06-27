import type { ModuleMetadata } from '@nestjs/common';
import type { JwtModuleOptions, JwtVerifyOptions } from '@nestjs/jwt';

/** Pulls the raw token string from the request. Return falsy ⇒ unauthorized. */
export type TokenExtractor = (request: any) => string | undefined | null;

/**
 * Maps/validates the decoded payload into the principal attached to the request.
 * Return `null`/`undefined` to reject (⇒ 401); throw to reject with your own error.
 * Default: returns the payload unchanged.
 */
export type PayloadValidator = (payload: any, request: any) => unknown | Promise<unknown>;

/** Guard behavior — shared by `forRoot` and `forRootAsync`. */
export interface JwtAuthGuardBehavior {
  /** Extract the bearer token. Default: `Authorization: Bearer <token>`. */
  getToken?: TokenExtractor;
  /** Map/validate the decoded payload into `request[attachTo]`. Default: identity. */
  validate?: PayloadValidator;
  /** Request property the principal is attached to. Default: `'user'`. */
  attachTo?: string;
  /** Extra options forwarded to `JwtService.verifyAsync` (audience, issuer, …). */
  verifyOptions?: JwtVerifyOptions;
  /** Register the guard globally via `APP_GUARD`. Default: `true`. */
  registerGuard?: boolean;
  /** Register the module globally. Default: `true`. */
  isGlobal?: boolean;
}

/** Synchronous registration: pass the `@nestjs/jwt` config directly. */
export interface JwtAuthOptions extends JwtAuthGuardBehavior {
  /** Forwarded verbatim to `JwtModule.register` (secret/keys, signOptions, …). */
  jwt: JwtModuleOptions;
}

/** Asynchronous registration: build the `@nestjs/jwt` config from injected deps. */
export interface JwtAuthAsyncOptions extends JwtAuthGuardBehavior {
  imports?: ModuleMetadata['imports'];
  inject?: any[];
  useFactory: (...args: any[]) => JwtModuleOptions | Promise<JwtModuleOptions>;
}

/** Fully-populated behavior consumed by the guard. */
export interface ResolvedGuardOptions {
  getToken: TokenExtractor;
  validate: PayloadValidator;
  attachTo: string;
  verifyOptions?: JwtVerifyOptions;
}

/** Default extractor: the `Authorization: Bearer <token>` header. */
export const defaultGetToken: TokenExtractor = (request) => {
  const header = request?.headers?.authorization;
  if (typeof header !== 'string') return undefined;
  return header.startsWith('Bearer ') ? header.slice(7) : undefined;
};

/** Default validator: pass the decoded payload through unchanged. */
export const defaultValidate: PayloadValidator = (payload) => payload;

/** Merge behavior over the defaults. */
export function resolveGuardOptions(behavior: JwtAuthGuardBehavior = {}): ResolvedGuardOptions {
  return {
    getToken: behavior.getToken ?? defaultGetToken,
    validate: behavior.validate ?? defaultValidate,
    attachTo: behavior.attachTo ?? 'user',
    verifyOptions: behavior.verifyOptions
  };
}
