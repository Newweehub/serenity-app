import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { containers } from '../repositories/cosmosClient.js';

const router = Router();

// POST /api/push/subscribe — save browser push subscription
router.post('/subscribe', asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'No subscription' });

  await containers.pushSubscriptions().items.upsert({
    id: req.userId,
    userId: req.userId,
    subscription,
    updatedAt: new Date().toISOString(),
  });

  res.json({ ok: true });
}));

export default router;