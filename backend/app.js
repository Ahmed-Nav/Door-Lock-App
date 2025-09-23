// backend/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const authRoutes = require("./routes/authRoutes");
const claimRoutes = require("./routes/claimRoutes");
const aclRoutes = require("./routes/aclRoutes");
const groupRoutes = require("./routes/groupRoutes");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// mount everything under /api
app.use("/api/auth", authRoutes);
app.use("/api", claimRoutes);
app.use("/api", aclRoutes);
app.use("/api", groupRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("backend on :" + PORT));
