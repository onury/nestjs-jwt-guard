import { Inject, Injectable } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';

/**
 * Thin token-issuance helper over `@nestjs/jwt`'s `JwtService`, using the JWT
 * config registered through {@link JwtAuthModule}. Call it after you've validated
 * a user (see the `nestjs-credentials` companion for that half).
 */
@Injectable()
export class JwtAuthService {
  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

  /** Signs `payload` into a token. `options` overrides the module's signOptions. */
  sign(payload: Record<string, unknown>, options?: JwtSignOptions): Promise<string> {
    return this.jwt.signAsync(payload, options);
  }
}
