/**
 * Auth middleware
 * 
 * For the hackathon, this validates a simple x-user-id header.
 * In production, replace with Azure Static Web Apps authentication
 * which injects x-ms-client-principal automatically.
 */
export function authMiddleware(req, res, next) {
  // Azure Static Web Apps injects this header after login
  const userId =
    req.headers['x-ms-client-principal-id'] || // Azure SWA production
    req.headers['x-user-id'];                   // Local dev fallback

  if (!userId) {
    return res.status(401).json({
      error: 'Unauthorised',
      message: 'No user identity found. Please log in.',
    });
  }

  // Attach userId to request so controllers can use it
  req.userId = userId;
  next();
}