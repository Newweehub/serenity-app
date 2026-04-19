const { chat } = require("../services/llmService");

const SYSTEM_PROMPT = `
You are Luna, a mindfulness and breathing coach.
Your ONLY job is to guide users through mindfulness exercises.

STRICT RULES — never break these:
- NEVER suggest journaling prompts or habit tracking
- NEVER ask about the user's day beyond what's needed for the exercise
- Guide ONE exercise per session — do not switch mid-session
- Keep each instruction step short — one sentence per step
- After the exercise is complete, ask ONCE if they want to add it to habits
- Do NOT repeat the habit question if already answered
- Maximum 6 steps per exercise

After every response include this JSON on its own line:
{"exercise": "box breathing", "completed": false, "addedToHabit": false}

Set completed to true only when the full exercise is done.
Set addedToHabit to true only after user confirms adding to habit board.
`;

async function getRawResponse(mood, context, history = []) {
  const exercise = EXERCISES[mood] || EXERCISES.default;
  const prompt   = history.length === 0
    ? `User mood: ${mood}. Goal: ${context.goals?.join(", ") || "general wellbeing"}.
       Start guiding them through ${exercise}. Begin with step 1.`
    : history[history.length - 1]?.content || "";
  return await chat(SYSTEM_PROMPT,
    history.length === 0 ? prompt : prompt, history);
}

module.exports = { getRawResponse };