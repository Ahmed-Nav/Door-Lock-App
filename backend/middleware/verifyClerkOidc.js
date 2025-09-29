// backend/middleware/verifyClerkOidc.js

const { createRemoteJWKSet, jwtVerify } = require("jose");

const ISSUER = process.env.ISSUER; 
const CLIENT_ID = process.env.CLERK_CLIENT_ID_MOBILE; 

if (!ISSUER) {
  throw new Error(
    "ISSUER missing in env (e.g., https://<sub>.clerk.accounts.dev)"
  );
}
if (!CLIENT_ID) {
  throw new Error("CLERK_CLIENT_ID_MOBILE missing in env");
}


const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));


module.exports = async function verifyClerkOidc(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "missing_bearer" });
    }
    const token = auth.slice("Bearer ".length).trim();
    if (!token) {
      return res.status(401).json({ error: "empty_token" });
    }

    
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: CLIENT_ID, 
    });

    
    const clerkId = payload.sub; 
    const email =
      payload.email ||
      payload.email_address || 
      (Array.isArray(payload.emails) ? payload.emails[0] : null) ||
      null;

    if (!clerkId) {
      return res.status(401).json({ error: "missing_sub" });
    }

    req.auth = { clerkId, email, token }; 
    next();
  } catch (e) {
    console.error("OIDC verify failed:", e?.code || e?.name, e?.message);
    return res.status(401).json({ error: "unauthorized" });
  }
};
