const { chat }                    = require("../services/llm");
const { upsertItem, queryItems,
        deleteItem }              = require("../services/cosmos");
const { updateContext, getContext } = require("./contextAgent");
const { v4: uuidv4 }              = require("uuid");

const SYSTEM_PROMPT = `
You are an encouraging habit coach named Max.
You help users build sustainable habits aligned with their goals.

Rules:
- Always be encouraging, never guilt-tripping
- When a user misses a habit: validate first, then offer a smaller alternative
- Suggest habits that are specific, small, and achievable
- Frame everything positively — progress over perfection
- Max response: 3-4 sentences
`;

// Get all habits for a user
async function getHabits(userId) {
  return await queryItems(
    "habits",
    "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC",
    [{ name: "@userId", value: userId }]
  );
}

// Add a new habit
async function addHabit(userId, name, category = "general") {
  const habit = {
    id:          uuidv4(),
    userId,
    name,
    category,
    streak:      0,
    completedDates: [],
    createdAt:   new Date().toISOString(),
    active:      true
  };
  await upsertItem("habits", habit);

  // Update context with active habits list
  const context = await getContext(userId);
  const activeHabits = [...(context.activeHabits || []), name];
  await updateContext(userId, { activeHabits });

  return habit;
}

// Mark habit as done for today
async function checkOffHabit(userId, habitId) {
  const habit = await queryItems(
    "habits",
    "SELECT * FROM c WHERE c.id = @id AND c.userId = @userId",
    [{ name: "@id",     value: habitId },
     { name: "@userId", value: userId }]
  );

  if (!habit[0]) return null;

  const today    = new Date().toISOString().split("T")[0];
  const updated  = {
    ...habit[0],
    completedDates: [...habit[0].completedDates, today],
    streak: habit[0].streak + 1,
    lastCompleted: today
  };

  return await upsertItem("habits", updated);
}

// Handle missed habit — return encouraging AI response
async function handleMissedHabit(userId, habitName, context) {
  const prompt = `
    The user missed their "${habitName}" habit today.
    Their goal is: ${context.goals?.join(", ") || "general wellbeing"}.
    Respond with encouragement and suggest a smaller version they can do right now.
  `;
  const response = await chat(SYSTEM_PROMPT, prompt);
  return { content: response };
}

// AI suggests a new habit based on journal themes
async function suggestHabit(userId, context) {
  const prompt = `
    Based on this user's data, suggest ONE specific small habit:
    Goals: ${context.goals?.join(", ") || "general wellbeing"}
    Recurring journal themes: ${context.recurringThemes?.join(", ") || "none"}
    Dominant emotion: ${context.dominantEmotion || "neutral"}
    Current habits: ${context.activeHabits?.join(", ") || "none yet"}
    
    Suggest a habit that directly addresses a pattern you notice.
    Format: {"name": "habit name", "reason": "why this helps", "category": "category"}
  `;
  const raw = await chat(SYSTEM_PROMPT, prompt);
  try {
    const match = raw.match(/\{.*\}/s);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

async function processMessage(userId, message, history = []) {
  const response = await chat(SYSTEM_PROMPT, message, history);
  return { content: response };
}

module.exports = {
  getHabits,
  addHabit,
  checkOffHabit,
  handleMissedHabit,
  suggestHabit,
  processMessage
};