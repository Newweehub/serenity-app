import { userRepository } from '../repositories/userRepository.js';
import { habitRepository } from '../repositories/habitRepository.js';
import { journalRepository } from '../repositories/journalRepository.js';
import { extractMemoryPatch } from '../agents/memoryAgent.js';

/**
 * Build the runtime context object injected into every agent prompt.
 */
export async function buildContext(userId) {
  const [user, habits, recentThemeRows] = await Promise.all([
    userRepository.findById(userId),
    habitRepository.findActiveByUser(userId),
    journalRepository.findRecentThemes(userId, 7),
  ]);

  if (!user) {
    return {
      displayName: 'there',
      currentGoals: [],
      moodTrend: 'stable',
      lastSessionSummary: 'No previous session',
      journalStreak: 0,
      mindfulnessStreak: 0,
      habitAdherenceScore: 0,
      preferredMindfulnessDuration: 5,
      activeHabits: [],
      recentThemes: [],
      dominantEmotions: [],
    };
  }

  // Count top themes
  const themeCounts = {};
  recentThemeRows.forEach(t => { themeCounts[t] = (themeCounts[t] || 0) + 1; });
  const recentThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme]) => theme);

  return {
    displayName: user.profile.displayName,
    currentGoals: user.memoryContext.currentGoals,
    moodTrend: user.memoryContext.moodTrend,
    lastSessionSummary: user.memoryContext.lastSessionSummary,
    journalStreak: user.streaks.journalStreak,
    mindfulnessStreak: user.streaks.mindfulnessStreak,
    habitAdherenceScore: user.memoryContext.habitAdherenceScore,
    preferredMindfulnessDuration: user.memoryContext.preferredMindfulnessDuration,
    activeHabits: habits.map(h => ({ id: h.id, name: h.name, streak: h.streak.current })),
    recentThemes,
    dominantEmotions: user.memoryContext.dominantEmotions,
  };
}

/**
 * Retrieve a user's profile. Creates a default profile if not found.
 */
export async function getOrCreateUser(userId, displayName = 'Friend') {
  return userRepository.findOrCreate(userId, {
    profile: {
      displayName,
      email: '',
      timezone: 'UTC',
      createdAt: new Date().toISOString(),
      language: 'en',
    },
    preferences: {
      reminderTime: '08:00',
      preferredExerciseTypes: [],
      habitCheckInFrequency: 'daily',
      notificationsEnabled: true,
    },
    memoryContext: {
      currentGoals: [],
      moodTrend: 'stable',
      dominantEmotions: [],
      lastSessionSummary: '',
      habitAdherenceScore: 0,
      preferredMindfulnessDuration: 5,
      updatedAt: new Date().toISOString(),
    },
    streaks: {
      journalStreak: 0,
      mindfulnessStreak: 0,
      longestJournalStreak: 0,
    },
  });
}

/**
 * Update a user's preferences.
 */
export async function updatePreferences(userId, preferences) {
  const user = await userRepository.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  user.preferences = { ...user.preferences, ...preferences };
  return userRepository.upsert(user);
}

/**
 * After a session ends, extract a memory patch and persist it.
 * Called fire-and-forget from chatController — errors are swallowed.
 */
export async function updateMemoryAfterSession(userId, history) {
  const patch = await extractMemoryPatch(history);
  if (!patch) return;

  const user = await userRepository.findById(userId);
  if (!user) return;

  user.memoryContext = {
    ...user.memoryContext,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await userRepository.upsert(user);
}