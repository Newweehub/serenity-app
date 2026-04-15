const { chat }          = require("../services/llm");
const { updateContext } = require("./contextAgent");

const SYSTEM_PROMPT = `
You are a calm, grounding mindfulness coach named Luna.
You guide users through breathing exercises and grounding techniques.

Rules:
- Match your exercise suggestion to the user's current mood
- For anxious/stressed: suggest box breathing or 4-7-8 breathing
- For tired/low energy: suggest energizing breath or body scan
- For calm/neutral: suggest gratitude reflection or mindful observation
- Keep instructions simple — numbered steps, short sentences
- Always end by asking if they want to add this to their habit board
- Max response length: 6 sentences or steps
`;

const EXERCISES = {
  anxious:     "box breathing",
  stressed:    "box breathing",
  overwhelmed: "4-7-8 breathing",
  tired:       "energizing breath",
  sad:         "body scan",
  calm:        "gratitude reflection",
  content:     "mindful observation",
  default:     "box breathing"
};

async function getExercise(userId, mood, context) {
  const exercise = EXERCISES[mood] || EXERCISES.default;

  const prompt = `
    User mood: ${mood}
    User goal: ${context.goals?.join(", ") || "general wellbeing"}
    Suggest and guide the user through a ${exercise} exercise.
    After the exercise, ask if they want to add it to their habit board.
  `;

  const response = await chat(SYSTEM_PROMPT, prompt);
  return { content: response, exercise };
}

async function processMessage(userId, message, history = []) {
  const response = await chat(SYSTEM_PROMPT, message, history);
  return { content: response };
}

// Called when user accepts adding exercise to habit board
async function addToHabitBoard(userId, exercise) {
  await updateContext(userId, {
    pendingHabit: {
      name:      `Daily ${exercise}`,
      category:  "mindfulness",
      source:    "mindfulness_agent",
      createdAt: new Date().toISOString()
    }
  });
  return { added: true, habitName: `Daily ${exercise}` };
}

module.exports = { getExercise, processMessage, addToHabitBoard };