const { chat }   = require("../services/llmService");
const contextSvc = require("../services/contextService");

const SYSTEM_PROMPT = `
You are an encouraging habit coach named Max.
- Always be encouraging, never guilt-tripping
- When habit missed: validate first, offer smaller alternative
- Suggest specific, small, achievable habits
- Max 3-4 sentences
`;

async function suggestHabit(userId) {
  const context = await contextSvc.getContext(userId);
  const prompt  = `
    Goals: ${context.goals?.join(", ") || "general wellbeing"}
    Recurring journal themes: ${context.recurringThemes?.join(", ") || "none"}
    Dominant emotion: ${context.dominantEmotion || "neutral"}
    Current habits: ${context.activeHabits?.join(", ") || "none yet"}
    Suggest ONE specific small habit. Respond ONLY with:
    {"name": "habit name", "reason": "why this helps", "category": "category"}
  `;
  const raw = await chat(SYSTEM_PROMPT, prompt);
  try {
    const match = raw.match(/\{.*\}/s);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

async function handleMissedHabit(habitName, context) {
  const prompt  = `
    User missed their "${habitName}" habit.
    Goal: ${context.goals?.join(", ") || "general wellbeing"}
    Encourage them and suggest a smaller version they can do right now.
  `;
  const content = await chat(SYSTEM_PROMPT, prompt);
  return { content };
}

async function processMessage(message, history = []) {
  const content = await chat(SYSTEM_PROMPT, message, history);
  return { content };
}

module.exports = { suggestHabit, handleMissedHabit, processMessage };