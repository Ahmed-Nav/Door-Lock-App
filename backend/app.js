// backend/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const { v4: uuidv4 } = require("uuid");
const errorHandler = require("./middleware/errorHandler");
const rateLimit = require("express-rate-limit");
const apiLimiter = rateLimit({ windowMs: 60_000, max: 300 });

const authRoutes = require("./routes/authRoutes");
const claimRoutes = require("./routes/claimRoutes");
const aclRoutes = require("./routes/aclRoutes");
const groupRoutes = require("./routes/groupRoutes");
const keyRoutes = require("./routes/keyRoutes");
const mfgRoutes = require("./routes/mfgRoutes");
const lockRoutes = require("./routes/lockRoutes");
const userRoutes = require("./routes/userRoutes");
const inviteRoutes = require("./routes/inviteRoutes");


const app = express();
app.use(helmet());
app.use(cors({
   origin: (process.env.CORS_ORIGINS || "")
     .split(",")
     .map(s => s.trim())
     .filter(Boolean),
   credentials: true,
 }));
app.use((req, _res, next) => {
   req.id = uuidv4();
   next();
 });
app.use(bodyParser.json({ limit: "1mb" }));
app.use(apiLimiter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));


app.use("/api/auth", authRoutes);
app.use("/api", claimRoutes);
app.use("/api", aclRoutes);
app.use("/api", groupRoutes);
app.use("/api", keyRoutes);
app.use("/api", mfgRoutes);
app.use("/api", lockRoutes);
app.use("/api", userRoutes);
app.use("/api/invite", inviteRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("backend on :" + PORT));
