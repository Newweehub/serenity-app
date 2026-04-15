const { chat }             = require("../services/llm");
const { getContext, logMood } = require("./contextAgent");
const journalAgent         = require("./journalAgent");
const mindfulnessAgent     = require("./mindfulnessAgent");
const habitAgent           = require("./habitAgent");
const insightsAgent        = require("./insightsAgent");

const ROUTING_PROMPT = `
You are an AI orchestrator for a mindfulness app.
Given the user's message and context, decide which agent should handle it.

Agents available:
- journal: user wants to write, reflect, or talk about feelings/thoughts
- mindfulness: user is stressed/anxious and needs a calming exercise
- habit: user is checking habits, missed a habit, or wants to add/change habits
- insights: user wants a summary, patterns, or weekly review
- general: casual greeting or unclear intent

Respond with ONLY one word: journal, mindfulness, habit, insights, or general
`;

async function route(userId, message, mood = null) {
  // Step 1 — get user context
  const context = await getContext(userId);

  // Step 2 — update mood if provided from check-in
  if (mood) await logMood(userId, mood);
  const currentMood = mood || context.mood || "neutral";

  // Step 3 — score signals to pick agent
  const routingMessage = `
    User message: "${message}"
    Current mood: ${currentMood}
    Time of day: ${getTimeOfDay()}
    Last activity: ${context.lastJournal ? "journaled recently" : "no recent journal"}
    Active habits: ${context.activeHabits?.length || 0}
  `;

  const agentName = (await chat(ROUTING_PROMPT, routingMessage)).trim().toLowerCase();

  // Step 4 — dispatch to correct agent
  return await dispatch(agentName, userId, message, context, currentMood);
}

async function dispatch(agentName, userId, message, context, mood) {
  switch (agentName) {
    case "mindfulness":
      return {
        agent:    "mindfulness",
        response: await mindfulnessAgent.getExercise(userId, mood, context)
      };

    case "journal":
      const journalResponse = await journalAgent.processMessage(userId, message);
      return {
        agent:    "journal",
        response: journalResponse
      };

    case "habit":
      return {
        agent:    "habit",
        response: await habitAgent.processMessage(userId, message)
      };

    case "insights":
      return {
        agent:    "insights",
        response: await insightsAgent.getWeeklyInsight(userId)
      };

    default:
      // General greeting — journal agent handles it warmly
      return {
        agent:    "journal",
        response: await journalAgent.getOpeningQuestion(userId, context)
      };
  }
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

module.exports = { route };