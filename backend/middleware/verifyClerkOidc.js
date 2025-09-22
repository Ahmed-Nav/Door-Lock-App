// backend/middleware/verifyClerkOidc.js
const { createRemoteJWKSet, jwtVerify } = require("jose");

/**
 * Decode `iss` from a JWT without verifying (for fallback when env is missing).
 */
function decodeIssuerFromJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    );
    return payload?.iss || null;
  } catch {
    return null;
  }
}

/**
 * Tiny cache of JWKS per issuer.
 */
const jwksCache = new Map();
function getJwksForIssuer(issuer) {
  if (!jwksCache.has(issuer)) {
    const url = new URL(`${issuer}/.well-known/jwks.json`);
    jwksCache.set(issuer, createRemoteJWKSet(url));
  }
  return jwksCache.get(issuer);
}

// Prefer CLERK_ISSUER (new name). Keep ISSUER for compatibility if you already set it.
const ENV_ISSUER = process.env.CLERK_ISSUER || process.env.ISSUER || null;

// Your two OAuth client IDs
const ADMIN_CLIENT_ID = process.env.CLERK_ADMIN_CLIENT_ID;
const USER_CLIENT_ID = process.env.CLERK_USER_CLIENT_ID;

module.exports = async function verifyClerkOidc(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token" });

    // Figure out the issuer: env first, else from the token payload.
    let issuer = ENV_ISSUER || decodeIssuerFromJwt(token);
    if (!issuer) {
      console.error("verifyClerkOidc: missing issuer (env + token).");
      return res.status(500).json({ error: "server-misconfig" });
    }

    // Optional safety gate: lock to your tenant
    const allowed = "https://moving-ferret-78.clerk.accounts.dev";
    if (!issuer.startsWith(allowed)) {
      console.error("verifyClerkOidc: iss not allowed:", issuer);
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify signature & issuer
    const JWKS = getJwksForIssuer(issuer);
    const { payload } = await jwtVerify(token, JWKS, { issuer });

    // Determine which client was used (admin/user)
    const clientId =
      payload.azp ||
      (Array.isArray(payload.aud) ? payload.aud[0] : payload.aud) ||
      payload.client_id ||
      null;

    let role = null;
    if (clientId === ADMIN_CLIENT_ID) role = "admin";
    else if (clientId === USER_CLIENT_ID) role = "user";
    else {
      console.error("verifyClerkOidc: unknown clientId", clientId);
      return res.status(401).json({ error: "unknown-client" });
    }

    req.userId = payload.sub;
    req.userEmail = payload.email || payload["email"] || null;
    req.role = role;
    req.clientId = clientId;
    req.issuer = issuer;

    next();
  } catch (e) {
    console.error("OIDC verify failed:", e.message);
    res.status(401).json({ error: "Unauthorized" });
  }
};
