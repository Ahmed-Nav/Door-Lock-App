// app.js
require("dotenv").config();
const express = require("express");
const connectDB = require("./services/db");
const authRoutes = require("./routes/authRoutes");
const unlockRoutes = require("./routes/unlockRoutes");

const { clerkMiddleware } = require("@clerk/express");

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error("MongoDB connect failed", err);
    process.exit(1);
  }

  const app = express();
  app.use(express.json());

  // Attach Clerk middleware (it attaches helpers like getAuth, requireAuth)
  app.use(
    clerkMiddleware({
      apiKey: process.env.CLERK_SECRET_KEY,
    })
  );

  app.use("/api/auth", authRoutes); // POST /api/auth/sync
  app.use("/api/unlock", unlockRoutes); // POST /api/unlock/payload

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`Backend running on http://localhost:${PORT}`)
  );
}

start();
