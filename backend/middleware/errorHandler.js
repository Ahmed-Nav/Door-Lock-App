module.exports = function errorHandler(err, req, res, _next) {
  const status =
    err.status ||
    (err.code === "FORBIDDEN"
      ? 403
      : err.code === "BAD_INPUT"
      ? 400
      : err.code === "NOT_FOUND"
      ? 404
      : err.code === "CLAIM_CONFLICT"
      ? 409
      : 500);

  const payload = {
    ok: false,
    code: err.code || "SERVER_ERROR",
  };
  if (process.env.NODE_ENV !== "production" && err.message) {
    payload.message = err.message;
  }
  // minimal structured log
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      reqId: req.id,
      method: req.method,
      path: req.originalUrl,
      user: req.userEmail,
      status,
      code: payload.code,
      msg: err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    })
  );
  res.status(status).json(payload);
};
