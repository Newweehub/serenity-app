const { chat }       = require("../services/llm");
const { queryItems } = require("../services/cosmos");

const SYSTEM_PROMPT = `
You are a thoughtful insights coach named Iris.
You analyze a user's week and deliver a warm, encouraging summary.

Rules:
- Always start with something positive you noticed
- Surface patterns the user may not have seen themselves
- Connect habit behaviour to emotional outcomes when you see a link
- End with one gentle suggestion for next week
- Tone: warm, like a trusted friend reviewing your week with you
- Max length: 4-5 sentences
`;

// Get this week's summary data
async function getWeeklyData(userId) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const since = weekAgo.toISOString();

  const [journals, habits] = await Promise.all([
    queryItems(
      "journals",
      "SELECT * FROM c WHERE c.userId = @userId AND c.date >= @since",
      [{ name: "@userId", value: userId },
       { name: "@since",  value: since }]
    ),
    queryItems(
      "habits",
      "SELECT * FROM c WHERE c.userId = @userId AND c.active = true",
      [{ name: "@userId", value: userId }]
    )
  ]);

  // Calculate stats
  const emotions  = journals.flatMap(j => j.emotions);
  const themes    = journals.flatMap(j => j.themes);
  const today     = new Date().toISOString().split("T")[0];
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  });

  const habitStats = habits.map(h => ({
    name:       h.name,
    completed:  h.completedDates.filter(d => weekDates.includes(d)).length,
    total:      7,
    streak:     h.streak
  }));

  return {
    journalCount:   journals.length,
    emotions:       countOccurrences(emotions),
    themes:         countOccurrences(themes),
    habitStats,
    topEmotion:     mostCommon(emotions),
    topTheme:       mostCommon(themes)
  };
}

// Generate weekly AI reflection
async function getWeeklyInsight(userId) {
  const data = await getWeeklyData(userId);

  const prompt = `
    Here is the user's week summary:
    Journal entries: ${data.journalCount}
    Top emotion: ${data.topEmotion}
    All emotions this week: ${JSON.stringify(data.emotions)}
    Recurring themes: ${JSON.stringify(data.themes)}
    Habit performance: ${JSON.stringify(data.habitStats)}
    
    Write a warm, insightful weekly reflection for this user.
    Find one meaningful pattern and connect it to their habit data if possible.
  `;

  const reflection = await chat(SYSTEM_PROMPT, prompt);
  return { reflection, data };
}

function countOccurrences(arr) {
  return arr.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

function mostCommon(arr) {
  if (!arr.length) return "neutral";
  return Object.entries(countOccurrences(arr))
    .sort((a, b) => b[1] - a[1])[0][0];
}

module.exports = { getWeeklyInsight, getWeeklyData };