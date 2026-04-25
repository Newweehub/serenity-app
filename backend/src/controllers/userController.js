import * as userService from '../services/userService.js';

/**
 * GET /api/users/me
 */
export async function getMe(req, res) {
  const user = await userService.getOrCreateUser(req.userId);
  res.json({ user });
}

/**
 * PATCH /api/users/me/preferences
 * Body: { reminderTime?, preferredExerciseTypes?, notificationsEnabled?, ... }
 */
export async function updatePreferences(req, res) {
  const user = await userService.updatePreferences(req.userId, req.body);
  res.json({ user });
}
