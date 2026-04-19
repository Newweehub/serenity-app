const journalSvc = require("./journalService");
const habitSvc   = require("./habitService");

function isWeekend() {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

async function getWeeklyData(userId) {
  const [journals, habitStats] = await Promise.all([
    journalSvc.getWeeklyEntries(userId),
    habitSvc.getWeeklyStats(userId)
  ]);

  const emotions = journals.flatMap(j => j.emotions || []);
  const themes   = journals.flatMap(j => j.themes   || []);

  // Also include daily mood check-ins from context
  const contextSvc = require("./contextService");
  const context    = await contextSvc.getContext(userId);
  if (context.mood && !emotions.includes(context.mood)) {
    emotions.push(context.mood);
  }

  return {
    journalCount: journals.length,
    emotions:     countOccurrences(emotions),
    themes:       countOccurrences(themes),
    habitStats,
    topEmotion:   mostCommon(emotions),
    topTheme:     mostCommon(themes),
    weekStart:    getWeekStart(),
    isWeekend:    isWeekend()
  };
}

// Monthly data — last 30 days
async function getMonthlyData(userId) {
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const journals = await journalSvc.getEntriesSince(
    userId, monthAgo.toISOString()
  );
  const habits   = await habitSvc.getWeeklyStats(userId);
  const emotions = journals.flatMap(j => j.emotions || []);
  const themes   = journals.flatMap(j => j.themes   || []);

  // Day-of-week breakdown for patterns
  const dayBreakdown = {};
  journals.forEach(j => {
    const day = new Date(j.date)
      .toLocaleDateString("en-US", { weekday: "long" });
    dayBreakdown[day] = (dayBreakdown[day] || 0) + 1;
  });

  return {
    journalCount:  journals.length,
    emotions:      countOccurrences(emotions),
    themes:        countOccurrences(themes),
    habitStats:    habits,
    topEmotion:    mostCommon(emotions),
    topTheme:      mostCommon(themes),
    dayBreakdown,
    isMonthly:     true
  };
}

async function getAllTimeData(userId) {
  // Get from very first entry ever
  const journals = await journalRepo.findByUser(userId, 9999);
  const habits   = await habitSvc.getWeeklyStats(userId);

  const emotions = journals.flatMap(j => j.emotions || []);
  const themes   = journals.flatMap(j => j.themes   || []);

  // Day-of-week pattern
  const dayBreakdown = {};
  journals.forEach(j => {
    if (!j.date) return;
    const day = new Date(j.date + "T12:00:00")
      .toLocaleDateString("en-US", { weekday: "long" });
    dayBreakdown[day] = (dayBreakdown[day] || 0) + 1;
  });

  // Month-over-month
  const monthBreakdown = {};
  journals.forEach(j => {
    if (!j.date) return;
    const month = new Date(j.date + "T12:00:00")
      .toLocaleDateString("en-US", {
        month: "long", year: "numeric"
      });
    monthBreakdown[month] = (monthBreakdown[month] || 0) + 1;
  });

  const firstEntry = journals[journals.length - 1];
  const daysSince  = firstEntry
    ? Math.round(
        (Date.now() - new Date(firstEntry.date + "T00:00:00").getTime())
        / (1000 * 60 * 60 * 24)
      )
    : 0;

  return {
    journalCount:   journals.length,
    emotions:       countOccurrences(emotions),
    themes:         countOccurrences(themes),
    habitStats:     habits,
    topEmotion:     mostCommon(emotions),
    topTheme:       mostCommon(themes),
    dayBreakdown,
    monthBreakdown,
    daysSince,
    isAllTime:      true
  };
}

function countOccurrences(arr) {
  return arr.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

function mostCommon(arr) {
  if (!arr.length) return null;
  return Object.entries(countOccurrences(arr))
    .sort((a, b) => b[1] - a[1])[0][0];
}

module.exports = {
  getWeeklyData,
  getMonthlyData,
  getAllTimeData, 
  isWeekend
};