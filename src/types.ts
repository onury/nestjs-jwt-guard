/**
 * Minimal decoded-token shape. The standard `sub` (subject = user id) is the only
 * conventional field; everything else is app-defined, so the index signature keeps
 * it open. Use your own payload type at the call site if you want stricter typing.
 */
export interface JwtPayload {
  sub?: string;
  [claim: string]: unknown;
}

/** A request after {@link JwtAuthGuard} has attached the validated principal. */
export interface AuthenticatedRequest<TUser = unknown> {
  user?: TUser;
  [key: string]: unknown;
}
