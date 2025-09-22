exports.requireAdmin = (req, res, next) =>
  req.role === "admin"
    ? next()
    : res.status(403).json({ ok: false, err: "forbidden" });

exports.requireUser = (req, res, next) =>
  req.role === "user"
    ? next()
    : res.status(403).json({ ok: false, err: "forbidden" });
