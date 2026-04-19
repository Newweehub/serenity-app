const journalRepo    = require("../repositories/journalRepository");
const contextSvc     = require("./contextService");

function getLocalDateStringFromOffset(tzOffset = 0) {
  // tzOffset is in minutes (getTimezoneOffset returns positive for west of UTC)
  const now      = new Date();
  const localMs  = now.getTime() - (tzOffset * 60 * 1000);
  const localDate = new Date(localMs);
  const year  = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, "0");
  const day   = String(localDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayId(userId, tzOffset = 0) {
  return `${userId}-${getLocalDateStringFromOffset(tzOffset)}`;
}

async function getTodayEntry(userId) {
  const id = getTodayId(userId);
  return await journalRepo.findById(userId, id);
}

async function appendMessage(userId, role, content, tzOffset = 0) {
  if (!userId || !content) return null;

  const id    = getTodayId(userId, tzOffset);
  const today = getLocalDateStringFromOffset(tzOffset);
  const time  = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
    timeZone: tzOffset === 0 ? "UTC"
      : `Etc/GMT${tzOffset > 0 ? "+" : ""}${tzOffset / 60}`
  });

  let entry;
  try {
    entry = await journalRepo.findById(userId, id);
  } catch {
    entry = null;
  }

  if (!entry) {
    entry = {
      id, userId,
      date:      today,
      firstTime: time,
      messages:  [],
      emotions:  [],
      themes:    [],
      summary:   ""
    };
  }

  entry.messages = entry.messages || [];
  entry.messages.push({ role, content, time });
  entry.lastTime = time;

  return await journalRepo.create(entry);
}

async function updateTodayMeta(userId, emotion, themes) {
  const id    = getTodayId(userId);
  let entry   = await journalRepo.findById(userId, id);
  if (!entry) return;

  // Add emotion if not already in list
  if (emotion && !entry.emotions.includes(emotion)) {
    entry.emotions.push(emotion);
  }
  // Merge themes
  if (themes?.length) {
    entry.themes = [...new Set([...entry.themes, ...themes])];
  }

  await journalRepo.create(entry);
  await journalRepo.indexEntry(entry);

  // Update user context
  await contextSvc.updateContext(userId, {
    lastJournal:     entry.messages
      .filter(m => m.role === "user")
      .map(m => m.content).join(" ").substring(0, 200),
    lastJournalDate: new Date().toISOString(),
    dominantEmotion: entry.emotions[0] || null,
    recurringThemes: entry.themes
  });
}

async function getPastEntries(userId, limit = 14) {
  return await journalRepo.findByUser(userId, limit);
}

async function getWeeklyEntries(userId) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return await journalRepo.findByUserSince(userId, weekAgo.toISOString());
}

async function getEntriesSince(userId, since) {
  return await journalRepo.getEntriesSince(userId, since);
}

module.exports = {
  getTodayEntry, appendMessage, updateTodayMeta,
  getPastEntries, getWeeklyEntries,
  getEntriesSince   // ← add
};