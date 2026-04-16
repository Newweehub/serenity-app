const journalRepo  = require("../repositories/journalRepository");
const contextSvc   = require("./contextService");
const { v4: uuidv4 } = require("uuid");

async function getPastEntries(userId, limit = 10) {
  return await journalRepo.findByUser(userId, limit);
}

async function saveEntry(userId, text, emotion, themes) {
  const entry = {
    id:       uuidv4(),
    userId,
    text,
    emotions: emotion ? [emotion] : [],
    themes:   themes  || [],
    date:     new Date().toISOString()
  };
  await journalRepo.create(entry);
  await journalRepo.indexEntry(entry);
  await contextSvc.updateContext(userId, {
    lastJournal:     text.substring(0, 200),
    lastJournalDate: entry.date,
    dominantEmotion: emotion,
    recurringThemes: themes
  });
  return entry;
}

async function searchPastEntries(userId, query, top = 3) {
  return await journalRepo.searchByMeaning(userId, query, top);
}

async function getWeeklyEntries(userId) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return await journalRepo.findByUserSince(userId, weekAgo.toISOString());
}

module.exports = {
  getPastEntries,
  saveEntry,
  searchPastEntries,
  getWeeklyEntries
};