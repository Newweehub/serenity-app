import * as searchService from '../services/searchService.js';

/**
 * GET /api/search
 * Query: { q, top? }
 */
export async function search(req, res) {
  const query = req.query.q ?? '';
  const top   = parseInt(req.query.top ?? '5');

  if (!query.trim()) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  const results = await searchService.searchJournals(req.userId, query, { top });
  res.json({ results });
}