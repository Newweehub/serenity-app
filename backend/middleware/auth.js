// Validates that userId is present on every protected request
module.exports = function auth(req, res, next) {
  const userId = req.body?.userId || req.params?.userId || req.query?.userId;
  if (!userId) {
    return res.status(401).json({ error: "userId is required" });
  }
  req.userId = userId;
  next();
};