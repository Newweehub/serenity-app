// Global error handler — catches anything thrown in controllers
module.exports = function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ERROR:`, err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error"
  });
};