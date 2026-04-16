const journalSvc = require("./journalService");
const habitSvc   = require("./habitService");

async function getWeeklyData(userId) {
  const [journals, habitStats] = await Promise.all([
    journalSvc.getWeeklyEntries(userId),
    habitSvc.getWeeklyStats(userId)
  ]);

  const emotions = journals.flatMap(j => j.emotions);
  const themes   = journals.flatMap(j => j.themes);

  return {
    journalCount: journals.length,
    emotions:     countOccurrences(emotions),
    themes:       countOccurrences(themes),
    habitStats,
    topEmotion:   mostCommon(emotions),
    topTheme:     mostCommon(themes)
  };
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

module.exports = { getWeeklyData };