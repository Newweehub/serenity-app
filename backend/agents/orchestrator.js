const { chat }        = require("../services/llmService");
const contextSvc      = require("../services/contextService");
const journalAgent    = require("./journalAgent");
const mindfulnessAgent = require("./mindfulnessAgent");
const habitAgent      = require("./habitAgent");
const insightsAgent   = require("./insightsAgent");

const ROUTING_PROMPT = `
You are an AI orchestrator for a mindfulness app.
Decide which agent handles the user message.
Agents: journal, mindfulness, habit, insights, general
Reply with ONE word only.
`;

async function route(userId, message, mood = null, history = []) {
  const context = await contextSvc.getContext(userId);
  if (mood) await contextSvc.logMood(userId, mood);
  const currentMood = mood || context.mood || "neutral";

  const routingMsg = `
    Message: "${message}"
    Mood: ${currentMood}
    Time: ${getTimeOfDay()}
    Has habits: ${context.activeHabits?.length > 0}
  `;

  const agentName = (await chat(ROUTING_PROMPT, routingMsg))
    .trim().toLowerCase().split(/\s/)[0];

  return await dispatch(agentName, userId, message,
                        context, currentMood, history);
}

async function dispatch(agentName, userId, message,
                        context, mood, history) {
  switch (agentName) {
    case "mindfulness":
      return {
        agent:    "mindfulness",
        response: await mindfulnessAgent.getExercise(mood, context)
      };
    case "journal":
      return {
        agent:    "journal",
        response: await journalAgent.processMessage(userId, message, history)
      };
    case "habit":
      return {
        agent:    "habit",
        response: await habitAgent.processMessage(message, history)
      };
    case "insights":
      return {
        agent:    "insights",
        response: await insightsAgent.getWeeklyInsight(userId)
      };
    default:
      return {
        agent:    "journal",
        response: { content: await journalAgent.getOpeningQuestion(userId) }
      };
  }
}

function getTimeOfDay() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

module.exports = { route };