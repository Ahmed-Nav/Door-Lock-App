const requireRoleInWorkspace = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.dbUser || !req.workspaceId) {
      console.error("requireRoleInWorkspace is missing dbUser or workspaceId");
      return res.status(500).json({ error: "Server misconfiguration" });
    }

    const { dbUser, workspaceId } = req;

    const workspaceAuth = dbUser.workspaces.find(
      (ws) => ws.workspace_id.toString() === workspaceId
    );

    if (!workspaceAuth) {
      return res.status(403).json({ ok: false, err: "FORBIDDEN" });
    }

    if (allowedRoles.includes(workspaceAuth.role)) {
      next();
    } else {
      return res.status(403).json({ ok: false, err: "FORBIDDEN" });
    }
  };
};

module.exports = {
  requireRoleInWorkspace,
  requireOwner: requireRoleInWorkspace(["owner"]),
  requireAdmin: requireRoleInWorkspace(["owner", "admin"]),
  requireUser: requireRoleInWorkspace(["owner", "admin", "user"]),
};
