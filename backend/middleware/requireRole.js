// backend/middleware/requireRole.js

/**
 * Enforce that the authenticated request's user has one of the allowed roles.
 * Expects a previous middleware to set req.user = { role: 'admin'|'user', ... }.
 *
 * @param {string|string[]} allowed - single role or list of roles
 */
function requireRole(allowed) {
  const allow = Array.isArray(allowed) ? allowed : [allowed];

  return (req, res, next) => {
    // If we don't even have a user hydrated, treat it as unauthorized
    if (!req.user || !req.user.role) {
      return res.status(401).json({ ok: false, err: "unauthorized" });
    }

    if (!allow.includes(req.user.role)) {
      return res.status(403).json({ ok: false, err: "forbidden" });
    }

    next();
  };
}

// Common helpers
const requireAdmin = requireRole("admin");
// For endpoints that any signed-in person can use, you often want both admin and user.
// If you really want "only regular users (not admins)", change this to ['user'].
const requireUser = requireRole(["user", "admin"]);

module.exports = {
  requireRole,
  requireAdmin,
  requireUser,
};
