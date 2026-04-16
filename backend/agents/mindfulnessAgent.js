const { chat } = require("../services/llmService");

const SYSTEM_PROMPT = `
You are a calm mindfulness coach named Luna.
- Match exercise to user mood
- For anxious/stressed: box breathing or 4-7-8
- For tired: body scan or energizing breath
- For calm: gratitude reflection
- Max 6 steps, short sentences
`;

const EXERCISES = {
  anxious: "box breathing", stressed: "box breathing",
  tired:   "body scan",    sad:      "body scan",
  calm:    "gratitude reflection",
  default: "box breathing"
};

async function getExercise(mood, context) {
  const exercise = EXERCISES[mood] || EXERCISES.default;
  const prompt   = `
    User mood: ${mood}
    User goal: ${context.goals?.join(", ") || "general wellbeing"}
    Guide the user through ${exercise}.
    End by asking if they want to add it to their habit board.
  `;
  const content = await chat(SYSTEM_PROMPT, prompt);
  return { content, exercise };
}

async function processMessage(message, history = []) {
  const content = await chat(SYSTEM_PROMPT, message, history);
  return { content };
}

module.exports = { getExercise, processMessage };