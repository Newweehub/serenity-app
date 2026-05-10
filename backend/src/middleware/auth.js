export function authMiddleware(req, res, next) {
  // Primary: Azure injects this after Easy Auth validates the session
  let userId = req.headers['x-ms-client-principal-id'];

  // Secondary: decode the full principal token if the ID header is missing
  if (!userId && req.headers['x-ms-client-principal']) {
    try {
      const principal = JSON.parse(
        Buffer.from(req.headers['x-ms-client-principal'], 'base64').toString('utf8')
      );
      userId = principal.userId || principal.user_id;
    } catch {
      // malformed token — fall through to x-user-id
    }
  }

  // Fallback: our own header (set by frontend api.js from localStorage)
  if (!userId) userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({
      error: 'Unauthorised',
      message: 'No user identity found. Please log in.',
    });
  }

  req.userId      = userId;
  req.displayName = req.headers['x-ms-client-principal-name'] ||
                    req.headers['x-display-name'] || '';
  next();
}