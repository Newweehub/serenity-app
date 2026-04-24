import { Router } from 'express';
import { create, list, getOne, getPrompt } from '../controllers/journalController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Note: /prompt must be registered BEFORE /:id to avoid Express matching
// "prompt" as an id parameter
router.get('/prompt',   asyncHandler(getPrompt));
router.get('/',         asyncHandler(list));
router.get('/:id',      asyncHandler(getOne));
router.post('/', validate(['freeText']), asyncHandler(create));

export default router;