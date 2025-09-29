// backend/middleware/requireRole.js
function requireRole(role) {
  return (req, res, next) => {
    if (req.role !== role) {
      return res.status(403).json({ ok: false, err: "forbidden" });
    }
    next();
  };
}

const requireAdmin = requireRole("admin");
const requireUser = requireRole("user");

// default + named exports
module.exports = requireRole;
module.exports.requireRole = requireRole;
module.exports.requireAdmin = requireAdmin;
module.exports.requireUser = requireUser;
