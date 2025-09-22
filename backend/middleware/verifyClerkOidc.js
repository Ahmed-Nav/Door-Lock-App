const { createRemoteJWKSet, jwtVerify } = require("jose");

const ISSUER = process.env.ISSUER;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

const ADMIN_CLIENT_ID = process.env.CLERK_ADMIN_CLIENT_ID;
const USER_CLIENT_ID = process.env.CLERK_USER_CLIENT_ID;

module.exports = async function verifyClerkOidc(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token" });

    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });

    // Which client logged in?
    const clientId =
      payload.azp ||
      (Array.isArray(payload.aud) ? payload.aud[0] : payload.aud) ||
      payload.client_id ||
      null;

    let role = null;
    if (clientId === ADMIN_CLIENT_ID) role = "admin";
    else if (clientId === USER_CLIENT_ID) role = "user";
    else return res.status(401).json({ error: "unknown-client" });

    req.userId = payload.sub;
    req.userEmail = payload.email || payload["email"];
    req.role = role;
    req.clientId = clientId;
    next();
  } catch (e) {
    console.error("OIDC verify failed:", e.message);
    res.status(401).json({ error: "Unauthorized" });
  }
};
