import { Router } from 'express';
import { search } from '../controllers/searchController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.get('/', asyncHandler(search));
export default router;
