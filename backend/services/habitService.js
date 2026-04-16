const habitRepo    = require("../repositories/habitRepository");
const contextSvc   = require("./contextService");
const { v4: uuidv4 } = require("uuid");

async function getHabits(userId) {
  return await habitRepo.findByUser(userId);
}

async function addHabit(userId, name, category = "general") {
  const habit = {
    id: uuidv4(), userId, name, category,
    streak: 0, completedDates: [],
    createdAt: new Date().toISOString(), active: true
  };
  await habitRepo.upsert(habit);
  const context     = await contextSvc.getContext(userId);
  const activeHabits = [...(context.activeHabits || []), name];
  await contextSvc.updateContext(userId, { activeHabits });
  return habit;
}

async function checkOffHabit(userId, habitId) {
  const habit = await habitRepo.findById(userId, habitId);
  if (!habit) return null;
  const today   = new Date().toISOString().split("T")[0];
  const updated = {
    ...habit,
    completedDates: [...habit.completedDates, today],
    streak:         habit.streak + 1,
    lastCompleted:  today
  };
  return await habitRepo.upsert(updated);
}

async function getWeeklyStats(userId) {
  const habits    = await habitRepo.findByUser(userId);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  });
  return habits.map(h => ({
    name:      h.name,
    completed: h.completedDates.filter(d => weekDates.includes(d)).length,
    total:     7,
    streak:    h.streak
  }));
}

module.exports = { getHabits, addHabit, checkOffHabit, getWeeklyStats };