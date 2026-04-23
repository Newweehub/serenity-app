import { Router } from 'express';
import { getMe, updatePreferences } from '../controllers/userController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.get('/me',               asyncHandler(getMe));
router.patch('/me/preferences', asyncHandler(updatePreferences));
export default router;