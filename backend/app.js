require("dotenv").config();
const express = require("express");
const connectDB = require("./services/db");

const authRoutes = require("./routes/authRoutes");
const claimRoutes = require("./routes/claimRoutes");
const aclRoutes = require("./routes/aclRoutes");
const userRoutes = require("./routes/userRoutes");

(async function start() {
  await connectDB();
  const app = express();
  app.use(express.json());

  // mount – each router protects its own endpoints with verifyClerkOidc
  app.use("/api/auth", authRoutes);
  app.use("/api/claim", claimRoutes);
  app.use("/api/locks", aclRoutes);
  app.use("/api/users", userRoutes.router);

  app.use("/api/health", (_req, res) => res.json({ ok: true }));
  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log(`Backend running on http://localhost:${PORT}`)
  );
})();
