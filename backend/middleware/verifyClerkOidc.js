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

module.exports = async function verifyClerkOidc(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token" });

    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });

    if (!payload?.sub) {
      return res.status(401).json({ error: "Invalid token" });
    }

    await connectDB();
    const clerkId = payload.sub;
    const email = payload["email"] || null;

    const dbUser = await User.findOneAndUpdate(
      { clerkId: clerkId },
      {
        $setOnInsert: {
          clerkId: clerkId,
          email: email,
          workspaces: [],
        },
      },
      {
        new: true,
        upsert: true, 
        lean: true, 
      }
    );
    
    req.clerkId = clerkId; 
    req.userId = dbUser._id; 
    req.dbUser = dbUser; 
    req.userEmail = dbUser.email;

    next();
  } catch (e) {
    console.error("OIDC verify failed:", e.message);
    res.status(401).json({ error: "Unauthorized" });
  }
};
