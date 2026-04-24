import * as journalService from '../services/journalService.js';

/**
 * POST /api/journal
 * Body: { freeText, promptUsed?, moodEmoji?, moodScore? }
 */
export async function create(req, res) {
  const entry = await journalService.createEntry(req.userId, req.body);
  res.status(201).json({ entry });
}

/**
 * GET /api/journal
 * Query: { limit?, offset? }
 */
export async function list(req, res) {
  const limit  = parseInt(req.query.limit  ?? '20');
  const offset = parseInt(req.query.offset ?? '0');
  const entries = await journalService.listEntries(req.userId, { limit, offset });
  res.json({ entries });
}

/**
 * GET /api/journal/:id
 */
export async function getOne(req, res) {
  const entry = await journalService.getEntry(req.params.id, req.userId);
  res.json({ entry });
}

/**
 * GET /api/journal/prompt
 * Query: { timeOfDay? }  — 'morning' | 'evening' | 'anytime'
 */
export async function getPrompt(req, res) {
  const timeOfDay = req.query.timeOfDay ?? 'anytime';
  const prompt = await journalService.getJournalPrompt(req.userId, timeOfDay);
  res.json({ prompt });
}