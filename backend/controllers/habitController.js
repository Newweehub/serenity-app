const habitSvc   = require("../services/habitService");
const habitAgent = require("../agents/habitAgent");

async function getHabits(req, res, next) {
  try {
    const habits = await habitSvc.getHabits(req.params.userId);
    res.json(habits);
  } catch (err) { next(err); }
}

async function createHabit(req, res, next) {
  try {
    const { userId, name, category } = req.body;
    const habit = await habitSvc.addHabit(userId, name, category);
    res.status(201).json(habit);
  } catch (err) { next(err); }
}

async function checkOff(req, res, next) {
  try {
    const { userId } = req.body;
    const habit = await habitSvc.checkOffHabit(userId, req.params.habitId);
    if (!habit) return res.status(404).json({ error: "Habit not found" });
    res.json(habit);
  } catch (err) { next(err); }
}

async function getSuggestion(req, res, next) {
  try {
    const suggestion = await habitAgent.suggestHabit(req.params.userId);
    res.json(suggestion);
  } catch (err) { next(err); }
}

module.exports = { getHabits, createHabit, checkOff, getSuggestion };