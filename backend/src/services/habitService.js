import { habitRepository } from '../repositories/habitRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { generateReframe, suggestHabit } from '../agents/habitAgent.js';
import { buildContext } from './userService.js';

function generateId() {
  return `habit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Get all active habits for a user.
 */
export async function getActiveHabits(userId) {
  return habitRepository.findActiveByUser(userId);
}

/**
 * Create a new habit after user confirms AI suggestion or manually.
 */
export async function createHabit(userId, { name, category, goal, schedule, addedVia = 'manual', originalUserMessage = '', aiMeta = {} }) {
  const habit = {
    id: generateId(),
    userId,
    name,
    goal: goal || '',
    category: category || 'other',
    status: 'active',
    schedule: {
      // dayOfWeek: 0=Sunday,1=Monday,...,6=Saturday. null means every day.
      dayOfWeek: schedule?.dayOfWeek ?? null,
      targetTime: schedule?.targetTime || null,
      reminderOffsetMinutes: schedule?.reminderOffsetMinutes ?? 30,
    },
    streak: { current: 0, longest: 0, lastCheckedIn: null },
    checkIns: [],
    aiMeta: {
      addedVia,
      originalUserMessage,
      reframingStrategies: [],
      exerciseId: aiMeta.exerciseId ?? null,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return habitRepository.save(habit);
}

/**
 * Mark a habit as complete or missed for today.
 * Returns the updated habit and — if missed — a reframing message.
 */
export async function checkIn(habitId, userId, { completed, note = '' }) {
  const habit = await habitRepository.findById(habitId, userId);
  if (!habit) throw Object.assign(new Error('Habit not found'), { status: 404 });

  const today = new Date().toISOString().slice(0, 10);

  // Prevent duplicate check-ins for the same day
  if (habit.checkIns.some(c => c.date === today)) {
    return { habit, reframe: null, alreadyCheckedIn: true };
  }

  habit.checkIns.unshift({ date: today, completed, note });
  habit.checkIns = habit.checkIns.slice(0, 90); // keep 90 days max

  if (completed) {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const streakContinued = habit.checkIns.some(c => c.date === yesterday && c.completed);
    habit.streak.current = streakContinued ? habit.streak.current + 1 : 1;
    habit.streak.longest = Math.max(habit.streak.current, habit.streak.longest);
    habit.streak.lastCheckedIn = today;
  } else {
    habit.streak.current = 0;
  }

  habit.updatedAt = new Date().toISOString();
  const updated = await habitRepository.save(habit);

  // Increment mindfulness streak on user profile if this is a mindfulness habit
  if (completed && habit.category === 'mindfulness') {
    try {
      const user = await userRepository.findById(userId);
      if (user) {
        const lastDate = user.streaks?.lastMindfulnessDate;
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
        const current = lastDate === yesterday || lastDate === today
          ? (user.streaks.mindfulnessStreak || 0) + (lastDate === today ? 0 : 1)
          : 1;
        user.streaks = {
          ...user.streaks,
          mindfulnessStreak: current,
          lastMindfulnessDate: today,
        };
        await userRepository.upsert(user);
      }
    } catch { /* non-critical */ }
  }

  // Generate reframe if missed
  let reframe = null;
  if (!completed) {
    const context = await buildContext(userId);
    reframe = await generateReframe(habit, context);
    // Store used reframe so it's not repeated
    updated.aiMeta.reframingStrategies = [
      reframe,
      ...(updated.aiMeta.reframingStrategies || []),
    ].slice(0, 10);
    await habitRepository.save(updated);
  }

  return { habit: updated, reframe, alreadyCheckedIn: false };
}

/**
 * Ask the AI to suggest a new habit based on a user message.
 * Does NOT save — returns the suggestion for the frontend to confirm.
 */
export async function getSuggestion(userId, userMessage) {
  const context = await buildContext(userId);
  return suggestHabit(userMessage, context);
}

/**
 * Update habit status (pause, archive, reactivate).
 */
export async function updateStatus(habitId, userId, status) {
  const habit = await habitRepository.findById(habitId, userId);
  if (!habit) throw Object.assign(new Error('Habit not found'), { status: 404 });
  habit.status = status;
  habit.updatedAt = new Date().toISOString();
  return habitRepository.save(habit);
}

/**
 * Calculate and persist the rolling 14-day adherence score.
 */
export async function recalculateAdherence(userId) {
  const habits = await habitRepository.findActiveByUser(userId);
  if (habits.length === 0) return 0;

  const days = 14;
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  let total = 0;
  let completed = 0;

  habits.forEach(h => {
    const recent = h.checkIns.filter(c => c.date >= since);
    total += days;
    completed += recent.filter(c => c.completed).length;
  });

  const score = total === 0 ? 0 : Math.round((completed / total) * 100) / 100;

  const user = await userRepository.findById(userId);
  if (user) {
    user.memoryContext.habitAdherenceScore = score;
    user.memoryContext.updatedAt = new Date().toISOString();
    await userRepository.upsert(user);
  }

  return score;
}

/**
 * Update a habit's schedule (reminder date and time).
 */
export async function updateSchedule(habitId, userId, { dayOfWeek, targetTime, reminderOffsetMinutes }) {
  const habit = await habitRepository.findById(habitId, userId);
  if (!habit) throw Object.assign(new Error('Habit not found'), { status: 404 });
  habit.schedule = {
    ...habit.schedule,
    ...(dayOfWeek !== undefined && { dayOfWeek }),
    ...(targetTime !== undefined && { targetTime }),
    ...(reminderOffsetMinutes !== undefined && { reminderOffsetMinutes }),
  };
  habit.updatedAt = new Date().toISOString();
  return habitRepository.save(habit);
}

/**
 * Update an existing habit's name, category, goal and schedule.
 * Used by the "adapt habit" flow when AI suggests a modification.
 */
export async function updateHabit(habitId, userId, { name, category, goal, schedule }) {
  const habit = await habitRepository.findById(habitId, userId);
  if (!habit) throw Object.assign(new Error('Habit not found'), { status: 404 });

  if (name     !== undefined) habit.name     = name;
  if (category !== undefined) habit.category = category;
  if (goal     !== undefined) habit.goal     = goal;

  if (schedule) {
    habit.schedule = {
      ...habit.schedule,
      ...(schedule.dayOfWeek  !== undefined && { dayOfWeek:  schedule.dayOfWeek }),
      ...(schedule.targetTime !== undefined && { targetTime: schedule.targetTime }),
    };
  }

  habit.updatedAt = new Date().toISOString();
  return habitRepository.save(habit);
}
