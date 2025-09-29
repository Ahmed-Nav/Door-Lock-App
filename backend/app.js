// backend/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");


const authRoutes = require("./routes/authRoutes");
const claimRoutes = require("./routes/claimRoutes");
const aclRoutes = require("./routes/aclRoutes");
const groupRoutes = require("./routes/groupRoutes");
const userRoutes = require("./routes/userRoutes"); 

const verifyClerkOidc = require("./middleware/verifyClerkOidc");
const { requireAdmin } = require("./middleware/requireRole");
const { ensureUserFromClerk } = require("./services/userService");

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));


async function hydrateUser(req, _res, next) {
  try {
    const user = await ensureUserFromClerk({
      clerkId: req.auth.clerkId,
      email: req.auth.email,
    });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}


app.use("/api/auth", authRoutes);
app.use("/api", claimRoutes); 
app.use("/api/users", userRoutes); 


app.use("/api/acl", verifyClerkOidc, hydrateUser, requireAdmin, aclRoutes);
app.use("/api/groups", verifyClerkOidc, hydrateUser, requireAdmin, groupRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("backend on :" + PORT));
