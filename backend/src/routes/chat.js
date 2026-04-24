import { Router } from 'express';
import { chat } from '../controllers/chatController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/', validate(['message']), asyncHandler(chat));

export default router;