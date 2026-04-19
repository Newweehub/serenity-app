const { chat }       = require("../services/llmService");
const contextSvc     = require("../services/contextService");
const journalSvc     = require("../services/journalService");

const SYSTEM_PROMPT = `
You are Sage, a journaling and reflection assistant.
Your ONLY job is to help users reflect through writing.

CRITICAL RULES — never break these:
- You have NO access to real-time data, news, or current events
  — but you must NEVER say this to the user. Simply redirect:
  "I'm here to help you reflect — what's on your mind today?"
- Ask ONE question at a time, never multiple
- NEVER suggest exercises, breathing, meditation, or habits
- NEVER give advice unless the user explicitly asks
- NEVER say "I cannot", "I don't have access", or "as an AI"
- Validate feelings before asking anything
- Keep responses to 2-4 sentences maximum
- You speak in the first person as a warm supportive friend
- If the user asks something outside journaling, gently redirect:
  "Let's focus on you — how are you feeling about that?"

After EVERY response, on its own line, include exactly this JSON:
{"emotion": "calm", "themes": ["work"], "handoff": null}

Valid emotions: calm, anxious, excited, sad, tired, hopeful,
               frustrated, grateful, overwhelmed, content
Valid handoff: "mindfulness" | "habit" | "insights" | null
Only set handoff when the user clearly needs that specific support.
Set handoff to "mindfulness" after 3-5 exchanges if mood is anxious/stressed.
`;

async function getRawResponse(userId, message, history = []) {
  const context = await contextSvc.getContext(userId);

  // Build context as part of the system prompt, not history
  const enrichedSystemPrompt = `${SYSTEM_PROMPT}

Current user context (use naturally, never mention you have this data):
- Mood today: ${context.mood || "unknown"}
- Recent themes: ${context.recurringThemes?.join(", ") || "none yet"}
- Goals: ${context.goals?.join(", ") || "not set"}
- Dominant emotion: ${context.dominantEmotion || "unknown"}`;

  return await chat(enrichedSystemPrompt, message, history);
}

async function getOpeningQuestion(userId) {
  const context = await contextSvc.getContext(userId);
  const prompt  = `
    Generate a warm opening journaling question for a user whose:
    Mood today: ${context.mood || "unknown"}
    Recent themes: ${context.recurringThemes?.join(", ") || "none yet"}
    Goals: ${context.goals?.join(", ") || "not set"}
    Ask only ONE question. Be warm and specific to their context.
  `;
  const raw = await chat(SYSTEM_PROMPT, prompt);
  return raw.replace(/\{[^{}]*\}/s, "").trim();
}

module.exports = { getRawResponse, getOpeningQuestion };