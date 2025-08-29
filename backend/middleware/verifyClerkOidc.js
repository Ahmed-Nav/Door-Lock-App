// middleware/verifyClerkOidc.js
const { createRemoteJWKSet, jwtVerify } = require("jose"); 

const ISSUER = "https://moving-ferret-78.clerk.accounts.dev"; // your Clerk issuer
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

module.exports = async function verifyClerkOidc(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token" });

    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });
    // typical Clerk OIDC has sub=userId, email in claims
    req.userId = payload.sub;
    req.userEmail = payload.email || payload["email"];
    return next();
  } catch (e) {
    console.error("OIDC verify failed:", e.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
