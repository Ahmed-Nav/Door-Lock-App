// backend/middleware/verifyClerkOidc.js
const { createRemoteJWKSet, jwtVerify } = require("jose");

const ISSUER = process.env.CLERK_ISSUER; // <- from .env
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

module.exports = async function verifyClerkOidc(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token" });

    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });

    // Typical Clerk token has sub=userId, and email at payload.email
    req.userId = payload.sub;
    req.userEmail = payload.email || payload["email"];
    return next();
  } catch (e) {
    console.error("OIDC verify failed:", e.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
