import * as insightService from '../services/insightService.js';

/**
 * GET /api/insights
 * Query: { period? }  — 'week' | 'month' | 'year'
 */
export async function getReport(req, res) {
  const period = req.query.period ?? 'week';
  const report = await insightService.getInsightReport(req.userId, period);
  res.json({ report });
}