require("dotenv").config();
const express = require("express");
const connectDB = require("./services/db");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const claimRoutes = require("./routes/claimRoutes");


const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan("dev"));
  // mount – each router protects its own endpoints with verifyClerkOidc

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/claim", claimRoutes);


  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log(`Backend running on http://localhost:${PORT}`)
  );
