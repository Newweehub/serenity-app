const insightsAgent = require("../agents/insightsAgent");
const insightsSvc   = require("../services/insightsService");

async function getWeeklyInsight(req, res, next) {
  try {
    const insight = await insightsAgent.getWeeklyInsight(req.params.userId);
    res.json(insight);
  } catch (err) { next(err); }
}

async function getStats(req, res, next) {
  try {
    const data = await insightsSvc.getWeeklyData(req.params.userId);
    res.json(data);
  } catch (err) { next(err); }
}

module.exports = { getWeeklyInsight, getStats };