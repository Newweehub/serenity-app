import { journalRepository } from '../repositories/journalRepository.js';
import { generateInsightReport } from '../agents/insightsAgent.js';
import { buildContext } from './userService.js';

/**
 * Generate an insight report for the given period.
 * Fetches recent journal summaries to give the agent concrete data.
 */
export async function getInsightReport(userId, period = 'week') {
  const daysMap = { week: 7, month: 30, year: 365 };
  const days = daysMap[period] ?? 7;

  const [context, entries] = await Promise.all([
    buildContext(userId),
    journalRepository.findByUser(userId, { limit: 20, offset: 0 }),
  ]);

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const periodEntries = entries.filter(e => e.createdAt >= since);

  const recentSummaries = periodEntries
    .map(e => e.aiAnalysis?.summary)
    .filter(Boolean);

  return generateInsightReport(context, period, recentSummaries);
}