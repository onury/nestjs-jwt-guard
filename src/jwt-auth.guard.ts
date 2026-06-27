import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { ResolvedGuardOptions } from './options';
import { IS_PUBLIC_KEY } from './public.decorator';
import { JWT_AUTH_OPTIONS } from './tokens';

/**
 * Bearer-token authentication guard built on `@nestjs/jwt` — no Passport.
 *
 * `@Public()` routes bypass it; everything else must present a valid token (via
 * the configured extractor). The decoded payload runs through `validate` and the
 * result is attached to `request[attachTo]` (default `req.user`). Missing /
 * invalid / expired tokens (and a `null` validate result) throw `UnauthorizedException`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JWT_AUTH_OPTIONS) private readonly options: ResolvedGuardOptions
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const { getToken, validate, attachTo, verifyOptions } = this.options;

    const token = getToken(request);
    if (!token) throw new UnauthorizedException();

    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(token, verifyOptions);
    } catch {
      // Invalid / expired / wrong-signature — never leak the underlying reason.
      throw new UnauthorizedException();
    }

    // `validate` runs outside the try so a custom validator can throw its own
    // (non-401) error and have it propagate untouched.
    const principal = await validate(payload, request);
    if (principal === null || principal === undefined) throw new UnauthorizedException();

    request[attachTo] = principal;
    return true;
  }
}
