import { Router } from 'express';
import { chat, journalChat } from '../controllers/chatController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// General orchestrated chat (mindfulness sessions, habit coach, etc.)
router.post('/', validate(['message']), asyncHandler(chat));

// Dedicated journal follow-up — always uses journal prompt, no intent classification
router.post('/journal', validate(['message']), asyncHandler(journalChat));

export default router;
