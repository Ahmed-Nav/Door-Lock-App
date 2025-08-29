// npm i jose
const { createRemoteJWKSet, jwtVerify } = require("jose");

module.exports = async function verifyClerkOidc(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token" });

    // Read iss from the token payload (no verify yet)
    const [, payloadB64] = token.split(".");
    const payloadPreview = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString()
    );
    const iss = (payloadPreview.iss || "").replace(/\/$/, ""); // strip trailing slash
    if (!iss) return res.status(401).json({ error: "Token missing iss" });

    const JWKS = createRemoteJWKSet(new URL(`${iss}/.well-known/jwks.json`));

    const { payload } = await jwtVerify(token, JWKS, { issuer: iss });
    req.userId = payload.sub;
    req.userEmail = payload.email || payload["email"] || null;

    // Optional fallback: if email claim is missing, ask Clerk
    if (!req.userEmail) {
      try {
        const { clerkClient } = require("@clerk/clerk-sdk-node");
        const u = await clerkClient.users.getUser(req.userId);
        req.userEmail =
          u?.emailAddresses?.[0]?.emailAddress ||
          u?.primaryEmailAddress?.emailAddress ||
          null;
      } catch {}
    }

    if (!req.userEmail)
      return res.status(400).json({ error: "No email found" });
    return next();
  } catch (e) {
    console.error("OIDC verify failed:", e.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
