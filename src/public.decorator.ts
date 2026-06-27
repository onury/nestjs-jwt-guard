import { SetMetadata } from '@nestjs/common';

/** Reflect-metadata key set by {@link Public}. */
export const IS_PUBLIC_KEY = 'nestjs-jwt-guard:public';

/**
 * Marks a route (or controller) as exempt from {@link JwtAuthGuard} — it is
 * reachable without a token. Use sparingly: login, health checks, webhooks.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
