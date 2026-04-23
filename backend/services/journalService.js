import { journalRepository } from '../repositories/journalRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { searchRepository } from '../repositories/searchRepository.js';
import { analyzeEntry, generatePrompt } from '../agents/journalAgent.js';
import { buildContext } from './userService.js';

function generateId() {
  return `journal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Save a new journal entry, run AI analysis, index for search, update streak.
 */
export async function createEntry(userId, { freeText, promptUsed, moodEmoji, moodScore }) {
  const context = await buildContext(userId);
  const aiAnalysis = await analyzeEntry(freeText, context);

  const entry = {
    id: generateId(),
    userId,
    type: 'entry',
    createdAt: new Date().toISOString(),
    content: { freeText, promptUsed, moodEmoji, moodScore },
    aiAnalysis: { ...aiAnalysis, analyzedAt: new Date().toISOString() },
    linkedHabits: [],
    searchIndexed: false,
  };

  await journalRepository.save(entry);

  // Index for search and update journal streak in parallel (non-blocking)
  Promise.all([
    searchRepository.indexEntry(entry).then(() => {
      entry.searchIndexed = true;
      return journalRepository.save(entry);
    }),
    updateJournalStreak(userId),
  ]).catch(err => console.error('[journalService] Background tasks failed:', err));

  return entry;
}

/**
 * Fetch a single entry (validates ownership).
 */
export async function getEntry(entryId, userId) {
  const entry = await journalRepository.findById(entryId, userId);
  if (!entry) throw Object.assign(new Error('Journal entry not found'), { status: 404 });
  return entry;
}

/**
 * List entries for a user with pagination.
 */
export async function listEntries(userId, { limit = 20, offset = 0 } = {}) {
  return journalRepository.findByUser(userId, { limit, offset });
}

/**
 * Generate a contextual journaling prompt for the user.
 */
export async function getJournalPrompt(userId, timeOfDay = 'anytime') {
  const context = await buildContext(userId);
  return generatePrompt(context, timeOfDay);
}

/**
 * Update the user's journal streak after a new entry.
 */
async function updateJournalStreak(userId) {
  const user = await userRepository.findById(userId);
  if (!user) return;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const lastStreakDate = user.streaks?.lastJournalDate;

  if (lastStreakDate === today) return; // already updated today

  const current = lastStreakDate === yesterday
    ? (user.streaks.journalStreak || 0) + 1
    : 1;

  user.streaks = {
    ...user.streaks,
    journalStreak: current,
    longestJournalStreak: Math.max(current, user.streaks.longestJournalStreak || 0),
    lastJournalDate: today,
  };

  await userRepository.upsert(user);
}