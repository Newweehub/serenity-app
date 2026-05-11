export function authMiddleware(req, res, next) {
  console.log('[auth] headers received:', {
    principalId:   req.headers['x-ms-client-principal-id'],
    principal:     req.headers['x-ms-client-principal'] ? 'present' : 'missing',
    userId:        req.headers['x-user-id'],
    displayName:   req.headers['x-display-name'],
  });

  let userId = req.headers['x-ms-client-principal-id'];

  if (!userId && req.headers['x-ms-client-principal']) {
    try {
      const principal = JSON.parse(
        Buffer.from(req.headers['x-ms-client-principal'], 'base64').toString('utf8')
      );
      userId = principal.userId || principal.user_id;
    } catch { /* malformed */ }
  }

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