// services/userService.js
const User = require("../models/User");

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();
const ADMIN_CLERK_ID = process.env.ADMIN_CLERK_ID || "";

async function adminExists() {
  return !!(await User.exists({ role: "admin" }));
}

function matchesConfiguredAdmin({ clerkId, email }) {
  const emailLc = (email || "").toLowerCase();
  return (
    (ADMIN_CLERK_ID && clerkId === ADMIN_CLERK_ID) ||
    (ADMIN_EMAIL && emailLc === ADMIN_EMAIL)
  );
}

// Upsert user every time a valid Clerk token hits the backend.
// Locks down who can be admin and when.
async function ensureUserFromClerk({ clerkId, email }) {
  if (!clerkId) throw new Error("Missing clerkId");

  let user = await User.findOne({ clerkId });

  if (!user) {
    const hasAdmin = await adminExists();
    const beAdmin = !hasAdmin && matchesConfiguredAdmin({ clerkId, email });

    user = await User.create({
      clerkId,
      email,
      role: beAdmin ? "admin" : "user",
    });
  } else {
    // Keep email fresh if changed in Clerk
    if (email && email !== user.email) {
      user.email = email;
      await user.save();
    }
  }
  return user;
}

async function setPersonaPublicKey({ clerkId, persona, publicKeyB64 }) {
  if (!["user", "admin"].includes(persona)) throw new Error("Invalid persona");
  if (!publicKeyB64 || publicKeyB64.length < 88)
    throw new Error("Invalid public key"); // quick sanity check

  const user = await User.findOne({ clerkId });
  if (!user) throw new Error("User not found");

  // Idempotent update
  user.publicKeys[persona] = publicKeyB64;
  await user.save();
  return user;
}

module.exports = {
  adminExists,
  ensureUserFromClerk,
  setPersonaPublicKey,
};
