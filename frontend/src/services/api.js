import axios from "axios";

const api = axios.create({
  baseURL: "/api",   // ← proxy handles the rest, no localhost needed
  headers: { "Content-Type": "application/json" }
});

// Auth
export const login = (name) =>
  api.post("/auth/login", { name }).then(r => r.data);

// Chat
export const sendMessage = (userId, message, mood = null, history = []) =>
  api.post("/chat", { userId, message, mood, history }).then(r => r.data);

export const checkInMood = (userId, mood) =>
  api.post("/chat/mood", { userId, mood }).then(r => r.data);

// Journal
export const getJournalEntries = (userId) =>
  api.get(`/journal/${userId}`).then(r => r.data);

export const createJournalEntry = (userId, text, emotion, themes) =>
  api.post("/journal", { userId, text, emotion, themes }).then(r => r.data);

// Habits
export const getHabits = (userId) =>
  api.get(`/habits/${userId}`).then(r => r.data);

export const addHabit = (userId, name, category = "general") =>
  api.post("/habits", { userId, name, category }).then(r => r.data);

export const checkOffHabit = (userId, habitId) =>
  api.patch(`/habits/${habitId}/check`, { userId }).then(r => r.data);

export const getHabitSuggestion = (userId) =>
  api.get(`/habits/${userId}/suggest`).then(r => r.data);

// Insights
export const getInsights = (userId) =>
  api.get(`/insights/${userId}`).then(r => r.data);

export const getStats = (userId) =>
  api.get(`/insights/${userId}/stats`).then(r => r.data);