module.exports = function extractActiveWorkspace(req, res, next) {
  const workspaceId = req.headers["x-workspace-id"];

  if (!workspaceId) {
    return res.status(400).json({
      ok: false,
      err: "missing-workspace-id",
      message: "No active workspace was specified in the request.",
    });
  }
  req.workspaceId = workspaceId;
  next();
};
