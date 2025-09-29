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
      publicKeys: {},
    });
  } else {
    if (email && email !== user.email) {
      user.email = email;
      await user.save();
    }
  }
  return user;
}

async function setPersonaPublicKey({ clerkId, persona, publicKeyB64 }) {
  if (!clerkId) throw new Error("clerkId_required");
  if (!["user", "admin"].includes(persona)) throw new Error("invalid_persona");
  if (typeof publicKeyB64 !== "string" || publicKeyB64.length < 80) {
    throw new Error("invalid_public_key");
  }

  const u = await User.findOneAndUpdate(
    { clerkId },
    { $set: { [`publicKeys.${persona}`]: publicKeyB64 } },
    { new: true, runValidators: true }
  );

  if (!u) throw new Error("user_not_found");
  return u;
}

module.exports = {
  adminExists,
  ensureUserFromClerk,
  setPersonaPublicKey,
};
