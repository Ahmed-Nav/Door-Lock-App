// backend/middleware/verifyClerkOidc.js
const { createRemoteJWKSet, jwtVerify } = require("jose");
const User = require("../models/User");
const { connectDB } = require("../services/db");

const ISSUER = process.env.ISSUER;
if (!ISSUER) {
  throw new Error(
    "ISSUER missing in env (e.g. https://<sub>.clerk.accounts.dev)"
  );
}


const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));


const ADMIN_CLIENT_ID = process.env.CLERK_ADMIN_CLIENT_ID || "";
const USER_CLIENT_ID = process.env.CLERK_USER_CLIENT_ID || "";


module.exports = async function verifyClerkOidc(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token" });

    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });

    
    const clientId =
      payload.azp ||
      (Array.isArray(payload.aud) ? payload.aud[0] : payload.aud) ||
      payload.client_id ||
      null;

    let tokenRole = null;
    if (clientId === ADMIN_CLIENT_ID) tokenRole = "admin";
    else if (clientId === USER_CLIENT_ID) tokenRole = "user";
    else return res.status(401).json({ error: "unknown-client" });

    await connectDB();

    let dbUser = await User.findOne({ clerkId: payload.sub });
    if (!dbUser) {
      
      dbUser = await User.create({
        clerkId: payload.sub,
        email: payload.email || payload["email"],
        role: "user",
      });
    }

    
    if (tokenRole === "admin" && dbUser.role !== "admin") {
      return res.status(403).json({ error: "Not authorized as admin" });
    }

    
    req.userId = payload.sub;
    req.userEmail = payload.email || payload["email"];
    req.role = dbUser.role; // always trust DB role
    req.clientId = clientId;
    req.dbUser = dbUser;

    next();
  } catch (e) {
    console.error("OIDC verify failed:", e.message);
    res.status(401).json({ error: "Unauthorized" });
  }
};
