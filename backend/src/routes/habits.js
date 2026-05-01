import { Router } from 'express';
import { list, create, checkIn, updateStatus, suggest, updateSchedule, updateHabit } from '../controllers/habitController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Static paths before parameterised ones
router.get('/',                                           asyncHandler(list));
router.post('/',          validate(['name']),             asyncHandler(create));
router.post('/suggest',   validate(['message']),          asyncHandler(suggest));
router.post('/:id/checkin', validate(['completed']),      asyncHandler(checkIn));
router.patch('/:id/status',   validate(['status']),      asyncHandler(updateStatus));
router.patch('/:id/schedule',                              asyncHandler(updateSchedule));
router.patch('/:id',                                          asyncHandler(updateHabit));

export default router;
