import { createError } from './errorHandler.js';

/**
 * Returns middleware that validates required fields in req.body.
 *
 * Usage:
 *   router.post('/', validate(['freeText']), asyncHandler(journalController.create))
 */
export function validate(requiredFields = []) {
  return (req, res, next) => {
    const missing = requiredFields.filter(
      field => req.body[field] === undefined || req.body[field] === ''
    );

    if (missing.length > 0) {
      return next(
        createError(400, `Missing required fields: ${missing.join(', ')}`)
      );
    }

    next();
  };
}
