const router = require("express").Router();
const crypto = require("crypto");
const Lock = require("../models/Lock");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");

router.get('/health', (_req, res) => res.json({ ok: true, router: 'claim' }));

// POST /api/claim { lockId: number, claimCode: String }
router.post('/', verifyClerkOidc, async (req, res) => {
  try {
    const { userId } = req;
    const { lockId, claimCode } = req.body || {};
    if (typeof lockId !== 'number' || !claimCode) {
      return res.status(400).json({ error: 'Lock Id and Claim Code Required' });
    }

    const lock = await Lock.findOne({ lockId });
    if (!lock) return res.status(404).json({ error: 'Lock not found' });

    const h = crypto.createHash('sha256').update(claimCode, 'utf8').digest('hex');
    if (lock.claimCodeHash !== h) return res.status(403).json({ error: 'Invalid claim code' });

    if(lock.claimed && lock.ownerAccountId && lock.ownerAccountId !== userId) {
      return res.status(403).json({ error: 'Lock already claimed' });
    }

    lock.ownerAccountId = userId;
    lock.claimed = true;
    await lock.save();
    
    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;