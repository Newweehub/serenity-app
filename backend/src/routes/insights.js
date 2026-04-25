import { Router } from 'express';
import { getReport } from '../controllers/insightController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.get('/', asyncHandler(getReport));
export default router;
