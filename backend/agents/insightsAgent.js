const { chat }      = require("../services/llmService");
const insightsSvc   = require("../services/insightsService");

const SYSTEM_PROMPT = `
You are a thoughtful insights coach named Iris.
- Start with something positive
- Surface patterns the user may not have noticed
- Connect habit behaviour to emotional outcomes when relevant
- End with one gentle suggestion for next week
- Tone: warm, like a trusted friend
- Max 4-5 sentences
`;

async function getWeeklyInsight(userId) {
  const data   = await insightsSvc.getWeeklyData(userId);
  const prompt = `
    Week summary:
    Journal entries: ${data.journalCount}
    Top emotion: ${data.topEmotion}
    All emotions: ${JSON.stringify(data.emotions)}
    Recurring themes: ${JSON.stringify(data.themes)}
    Habit performance: ${JSON.stringify(data.habitStats)}
    Write a warm weekly reflection. Find one meaningful pattern.
  `;
  const reflection = await chat(SYSTEM_PROMPT, prompt);
  return { reflection, data };
}

module.exports = { getWeeklyInsight };