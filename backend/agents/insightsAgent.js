const { chat }      = require("../services/llmService");
const insightsSvc   = require("../services/insightsService");

const SYSTEM_PROMPT = `
You are Iris, a weekly insights coach.
Your ONLY job is to analyze a user's data and give warm, meaningful insights.

STRICT RULES:
- NEVER guide exercises or journaling prompts directly
- Always reference specific numbers from the data
- Start with something genuinely positive
- Surface ONE pattern the user may not have noticed
- End with ONE gentle suggestion
- Maximum 5 sentences
- NEVER say "as an AI" or mention data limitations

CRITICAL — you MUST end your response with this exact JSON format
on its own line. Fill in ALL fields — never leave values empty:

{"suggestedHabit": {"name": "Evening walk", "reason": "You felt calmer on active days"}}

If you cannot think of a habit, use:
{"suggestedHabit": {"name": "5-minute breathing", "reason": "A short daily practice builds consistency"}}

NEVER output {"suggestedHabit": } — always include name and reason.
`;

function extractMeta(raw) {
  try {
    // Find JSON block
    const match = raw.match(/\{[\s\S]*"suggestedHabit"[\s\S]*\}/);
    if (!match) return {};
    let jsonStr = match[0];

    // Repair common malformed patterns
    // Fix: {"suggestedHabit": } → remove empty value
    jsonStr = jsonStr.replace(
      /"suggestedHabit"\s*:\s*\}/,
      '"suggestedHabit": null}'
    );
    // Fix: trailing commas
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

    const parsed = JSON.parse(jsonStr);

    // Validate suggestedHabit has required fields
    if (parsed.suggestedHabit &&
        (!parsed.suggestedHabit.name ||
         !parsed.suggestedHabit.reason)) {
      parsed.suggestedHabit = null;
    }

    return parsed;
  } catch (e) {
    console.warn("[InsightsAgent] JSON parse failed:", e.message);
    return {};
  }
}

function stripMeta(raw) {
  return (raw || "")
    .replace(/\{[\s\S]*"suggestedHabit"[\s\S]*\}/, "")
    .trim();
}

async function getInsightFromData(userId, data) {
  const prompt = `
    ${data.isMonthly ? "Monthly" : "Weekly"} summary data:
    - Journal entries this period: ${data.journalCount}
    - Top emotion: ${data.topEmotion || "none recorded"}
    - All emotions recorded: ${JSON.stringify(data.emotions)}
    - Recurring themes: ${JSON.stringify(data.themes)}
    - Habit performance: ${JSON.stringify(data.habitStats)}
    ${data.dayBreakdown
      ? `- Day breakdown: ${JSON.stringify(data.dayBreakdown)}`
      : ""}

    Write a warm ${data.isMonthly ? "monthly" : "weekly"} reflection.
    Then suggest a specific habit based on the patterns you see.
    Remember to end with the JSON block containing suggestedHabit.
  `;

  const raw        = await chat(SYSTEM_PROMPT, prompt);
  const reflection = stripMeta(raw);
  const meta       = extractMeta(raw);

  // Fallback if agent still returns empty suggestedHabit
  const suggestedHabit = meta.suggestedHabit || (
    data.topEmotion === "anxious" || data.topEmotion === "stressed"
      ? { name: "Morning breathing", reason: "A daily breathing practice can help manage anxiety" }
      : { name: "Evening reflection", reason: "A short daily check-in builds self-awareness" }
  );

  return { reflection, suggestedHabit, data };
}

async function getWeeklyInsight(userId) {
  const data = await insightsSvc.getWeeklyData(userId);
  return await getInsightFromData(userId, data);
}

module.exports = { getWeeklyInsight, getInsightFromData };