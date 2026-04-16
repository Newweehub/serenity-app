const { chat }       = require("../services/llmService");
const contextSvc     = require("../services/contextService");
const journalSvc     = require("../services/journalService");

const SYSTEM_PROMPT = `
You are a warm, supportive journaling coach named Sage.
- Ask only ONE question at a time
- Be empathetic, never clinical or prescriptive
- Validate feelings before asking anything
- Keep responses to 2-4 sentences
- Detect the dominant emotion and end with:
  {"emotion": "anxious", "themes": ["work", "stress"]}
`;

async function getOpeningQuestion(userId) {
  const context    = await contextSvc.getContext(userId);
  const pastThemes = context.recurringThemes?.join(", ") || "none yet";
  const prompt     = `
    User mood: ${context.mood || "unknown"}
    Recurring themes: ${pastThemes}
    Goals: ${context.goals?.join(", ") || "not set"}
    Generate a warm contextual opening journal question.
  `;
  const raw = await chat(SYSTEM_PROMPT, prompt);
  return extractContent(raw);
}

async function processMessage(userId, message, history = []) {
  const raw     = await chat(SYSTEM_PROMPT, message, history);
  const content = extractContent(raw);
  const meta    = extractMeta(raw);
  return { content, emotion: meta.emotion, themes: meta.themes };
}

function extractContent(raw) {
  return raw.replace(/\{"emotion".*?\}/s, "").trim();
}

function extractMeta(raw) {
  try {
    const match = raw.match(/\{"emotion".*?\}/s);
    return match ? JSON.parse(match[0]) : { emotion: "calm", themes: [] };
  } catch {
    return { emotion: "calm", themes: [] };
  }
}

module.exports = { getOpeningQuestion, processMessage };