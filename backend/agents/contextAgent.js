const { getItem, upsertItem } = require("../services/cosmos");
const { v4: uuidv4 } = require("uuid");

// Get full user context — called by Orchestrator before routing
async function getContext(userId) {
  const context = await getItem("users", userId, userId);
  if (!context) {
    // First-time user — return empty context
    return {
      id:            userId,
      userId,
      mood:          null,
      lastMoodDate:  null,
      lastJournal:   null,
      lastJournalDate: null,
      dominantEmotion: null,
      recurringThemes: [],
      activeHabits:  [],
      goals:         [],
      streakDays:    0,
      createdAt:     new Date().toISOString()
    };
  }
  return context;
}

// Update context after each agent interaction
async function updateContext(userId, updates) {
  const existing = await getContext(userId);
  const updated  = {
    ...existing,
    ...updates,
    id:     userId,
    userId,
    updatedAt: new Date().toISOString()
  };
  return await upsertItem("users", updated);
}

// Log mood check-in from dashboard
async function logMood(userId, mood) {
  return await updateContext(userId, {
    mood,
    lastMoodDate: new Date().toISOString()
  });
}

module.exports = { getContext, updateContext, logMood };