const { chat }          = require("../services/llmService");
const contextSvc        = require("../services/contextService");
const journalAgent      = require("./journalAgent");
const mindfulnessAgent  = require("./mindfulnessAgent");
const habitAgent        = require("./habitAgent");
const insightsAgent     = require("./insightsAgent");

const ROUTING_PROMPT = `
You are an AI orchestrator for a mindfulness app.
Decide which agent should handle the user's message.

Agents:
- journal: user wants to write, reflect, talk about feelings or thoughts
- mindfulness: user is stressed/anxious and needs a calming exercise
- habit: user is checking habits, missed a habit, wants to manage habits
- insights: user wants a summary, patterns, or weekly review
- general: casual greeting or unclear intent

Respond with ONE word only: journal, mindfulness, habit, insights, or general
`;

// Keywords that indicate an agent went off-script
const FORBIDDEN = {
  journal:     ["breathing exercise", "let's try", "meditation",
                "habit board", "here's an exercise"],
  mindfulness: ["journaling prompt", "write about", "habit tracker",
                "past entries"],
  habit:       ["breathing exercise", "journaling prompt",
                "let's meditate", "here's a reflection"],
  insights:    ["let's do a breathing", "journaling prompt",
                "try this exercise"]
};

function validateResponse(agentName, content) {
  if (!content) return { content: "I'm here to help. Could you tell me more?", flagged: true };
  const lower  = (content || "").toLowerCase();
  const flags  = FORBIDDEN[agentName] || [];
  const off    = flags.some(f => lower.includes(f));
  if (off) {
    console.warn(`[Orchestrator] Agent "${agentName}" went off-script`);
    return {
      content: "I'm here to help with that. Could you tell me a bit more?",
      flagged: true
    };
  }
  return { content, flagged: false };
}

function extractMeta(raw) {
  try {
    const match = raw.match(/\{[^{}]*\}/s);
    return match ? JSON.parse(match[0]) : {};
  } catch { return {}; }
}

function stripMeta(raw) {
  return (raw || "").replace(/\{[^{}]*\}/s, "").trim();
}

async function route(userId, message, mood = null, history = []) {
  const context     = await contextSvc.getContext(userId);
  if (mood) await contextSvc.logMood(userId, mood);
  const currentMood = mood || context.mood || "neutral";

  const routingMsg = `
    Message: "${message}"
    Mood: ${currentMood}
    Time: ${getTimeOfDay()}
    Has active habits: ${context.activeHabits?.length > 0}
  `;
  const agentName = (await chat(ROUTING_PROMPT, routingMsg))
    .trim().toLowerCase().split(/\s/)[0];

  return await dispatch(agentName, userId, message,
                        context, currentMood, history);
}

async function dispatch(agentName, userId, message,
                        context, mood, history) {
  let raw, meta, content;

  switch (agentName) {

    case "mindfulness":
      raw     = await mindfulnessAgent.getRawResponse(mood, context, history);
      meta    = extractMeta(raw);
      content = stripMeta(raw);
      return {
        agent:    "mindfulness",
        response: {
          content:      validateResponse("mindfulness", content).content,
          exercise:     meta.exercise || null,
          completed:    meta.completed || false,
          addedToHabit: meta.addedToHabit || false
        }
      };

    case "journal":
      raw     = await journalAgent.getRawResponse(userId, message, history);
      meta    = extractMeta(raw);
      content = stripMeta(raw);
      const validated = validateResponse("journal", content);
      return {
        agent:    "journal",
        response: {
          content:  validated.content,
          emotion:  meta.emotion  || "calm",
          themes:   meta.themes   || [],
          handoff:  validated.flagged ? null : (meta.handoff || null)
        }
      };

    case "habit":
      raw     = await habitAgent.getRawResponse(message, history);
      meta    = extractMeta(raw);
      content = stripMeta(raw);
      return {
        agent:    "habit",
        response: {
          content:    validateResponse("habit", content).content,
          event:      meta.event      || null,
          habitName:  meta.habitName  || null,
          suggestion: meta.suggestion || null
        }
      };

    case "insights":
      const insight = await insightsAgent.getWeeklyInsight(userId);
      return { agent: "insights", response: insight };

    default:
      raw     = await journalAgent.getRawResponse(userId, message, history);
      content = stripMeta(raw);
      return {
        agent:    "journal",
        response: {
          content: validateResponse("journal", content).content,
          emotion: "calm", themes: [], handoff: null
        }
      };
  }
}

function getTimeOfDay() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

module.exports = { route };