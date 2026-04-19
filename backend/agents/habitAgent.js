const { chat }   = require("../services/llmService");
const contextSvc = require("../services/contextService");

const SYSTEM_PROMPT = `
You are Max, a habit coach.
Your ONLY job is to help users build and maintain habits.

STRICT RULES — never break these:
- NEVER suggest journaling prompts or mindfulness exercises
- NEVER guilt-trip or pressure the user
- When a habit is missed: validate first, then suggest a SMALLER version
- Keep responses to 2-3 sentences maximum
- Only respond when directly asked or when a habit event occurs

After every response include this JSON on its own line:
{"event": "missed", "habitName": "Morning breathing", "suggestion": "Try 60 seconds instead"}

Valid event values: "checked", "missed", "added", "removed", "general", null
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

async function getRawResponse(message, history = []) {
  return await chat(SYSTEM_PROMPT, message, history);
}

module.exports = {
  getRawResponse,
  suggestHabit,
  handleMissedHabit
};