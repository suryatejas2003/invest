/** Errors that are safe to show a user. Anything else becomes a generic 500. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    readonly code: string = 'bad_request',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (m: string) => new AppError(m, 400, 'bad_request');
export const unauthorized = (m = 'Sign in to continue.') => new AppError(m, 401, 'unauthorized');
export const forbidden = (m = 'You do not have access to this.') => new AppError(m, 403, 'forbidden');
export const notFound = (m = 'Not found.') => new AppError(m, 404, 'not_found');
export const conflict = (m: string) => new AppError(m, 409, 'conflict');
export const tooMany = (m = 'Too many attempts. Try again shortly.') => new AppError(m, 429, 'rate_limited');

/** Never leak internals. Unknown errors are logged server-side and generalised. */
export function toPublicError(err: unknown): { message: string; status: number; code: string } {
  if (err instanceof AppError) return { message: err.message, status: err.status, code: err.code };
  console.error('[doorkey] unhandled error:', err);
  return { message: 'Something went wrong on our side. Try again.', status: 500, code: 'internal_error' };
}
