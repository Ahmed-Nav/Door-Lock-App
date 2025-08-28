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


  
  app.use(
    clerkMiddleware({
      secretKey: process.env.CLERK_SECRET_KEY,
    })
  );



  app.use("/api", (req, _res, next) => {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
    next();
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/unlock", unlockRoutes);


  app.use("/api", (req, res) => {
    res.status(404).json({
      error: "API route not found",
      method: req.method,
      path: req.originalUrl,
    });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`Backend running on http://localhost:${PORT}`)
  );
}

start();
