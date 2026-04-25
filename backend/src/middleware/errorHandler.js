/**
 * Global error handler — must be the last middleware registered in app.js
 *
 * Controllers signal errors by calling next(err) or by throwing inside
 * an async wrapper. All errors flow here for consistent JSON responses.
 */
export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message);
  if (isDev) console.error(err.stack);

  res.status(status).json({
    error: err.name || 'ServerError',
    message: err.message || 'Something went wrong. Please try again.',
    ...(isDev && { stack: err.stack }),
  });
}

/**
 * Wraps an async route handler and forwards any thrown errors to next().
 * Use this in every controller so you never need try/catch per route.
 *
 * Usage:  router.post('/', asyncHandler(myController.create))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Creates a typed HTTP error with a status code.
 * Usage:  throw createError(404, 'Journal entry not found')
 */
export function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
