import { openaiClient, MODEL } from './openaiClient.js';
import { prompts } from './prompts.js';

const FALLBACK_INSIGHT = {
  period: 'week',
  headline: "You showed up this week — that matters.",
  patterns: ["Not enough data yet to surface patterns."],
  moodTrend: 'stable',
  topEmotions: [],
  habitHighlight: "Keep building your streak.",
  suggestion: "Try journaling once more this week to unlock deeper insights.",
};

/**
 * Generate a structured insight report for a given time period.
 * @param {object} context - Runtime context with mood trend, habits, emotions
 * @param {string} period - 'week' | 'month' | 'year'
 * @param {Array}  recentJournalSummaries - Array of summary strings from recent entries
 */
export async function generateInsightReport(context, period, recentJournalSummaries = []) {
  const journalContext = recentJournalSummaries.length > 0
    ? `Recent journal summaries:\n${recentJournalSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
    : 'No journal entries yet for this period.';

  const response = await openaiClient.chat.completions.create({
    model: MODEL,
    max_tokens: 400,
    temperature: 0.5,
    messages: [
      { role: 'system', content: prompts.insightsAnalytics(context) },
      {
        role: 'user',
        content: `Generate a ${period}ly insight report. Return JSON only.\n\n${journalContext}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  try {
    const clean = raw.replace(/```json\n?|```/g, '').trim();
    const report = JSON.parse(clean);
    return { ...report, period, generatedAt: new Date().toISOString() };
  } catch {
    return { ...FALLBACK_INSIGHT, period, generatedAt: new Date().toISOString() };
  }
}
