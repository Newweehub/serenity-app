import * as habitService from '../services/habitService.js';

/**
 * GET /api/habits
 */
export async function list(req, res) {
  const habits = await habitService.getActiveHabits(req.userId);
  res.json({ habits });
}

/**
 * POST /api/habits
 * Body: { name, category, goal?, schedule?, addedVia?, originalUserMessage? }
 */
export async function create(req, res) {
  const habit = await habitService.createHabit(req.userId, req.body);
  res.status(201).json({ habit });
}

/**
 * POST /api/habits/:id/checkin
 * Body: { completed, note? }
 */
export async function checkIn(req, res) {
  const { completed, note } = req.body;
  const result = await habitService.checkIn(req.params.id, req.userId, { completed, note });
  res.json(result);
}

/**
 * PATCH /api/habits/:id/status
 * Body: { status }  — 'active' | 'paused' | 'archived'
 */
export async function updateStatus(req, res) {
  const habit = await habitService.updateStatus(req.params.id, req.userId, req.body.status);
  res.json({ habit });
}

/**
 * POST /api/habits/suggest
 * Body: { message }  — user's natural language goal/request
 */
export async function suggest(req, res) {
  const suggestion = await habitService.getSuggestion(req.userId, req.body.message);
  if (!suggestion) {
    return res.status(422).json({ error: 'Could not generate a suggestion. Please try again.' });
  }
  res.json({ suggestion });
}