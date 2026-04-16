const userRepo = require("../repositories/userRepository");

async function getContext(userId) {
  const user = await userRepo.findById(userId);
  if (!user) {
    return {
      id: userId, userId,
      mood: null, lastMoodDate: null,
      lastJournal: null, lastJournalDate: null,
      dominantEmotion: null, recurringThemes: [],
      activeHabits: [], goals: [], streakDays: 0,
      createdAt: new Date().toISOString()
    };
  }
  return user;
}

async function updateContext(userId, updates) {
  const existing = await getContext(userId);
  const updated  = {
    ...existing, ...updates,
    id: userId, userId,
    updatedAt: new Date().toISOString()
  };
  return await userRepo.upsert(updated);
}

async function logMood(userId, mood) {
  return await updateContext(userId, {
    mood,
    lastMoodDate: new Date().toISOString()
  });
}

module.exports = { getContext, updateContext, logMood };