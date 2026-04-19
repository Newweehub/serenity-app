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

async function getMonthlyInsight(req, res, next) {
  try {
    const { getMonthlyData } = require("../services/insightsService");
    const insightsAgent      = require("../agents/insightsAgent");
    const data               = await getMonthlyData(req.params.userId);
    const insight            = await insightsAgent
      .getInsightFromData(req.params.userId, data);
    res.json(insight);
  } catch (err) { next(err); }
}

async function getAllTimeInsight(req, res, next) {
  try {
    const insightsSvc   = require("../services/insightsService");
    const insightsAgent = require("../agents/insightsAgent");
    const data          = await insightsSvc.getAllTimeData(req.params.userId);
    const insight       = await insightsAgent
      .getInsightFromData(req.params.userId, data);
    res.json(insight);
  } catch (err) { next(err); }
}

module.exports = {
  getWeeklyInsight,
  getStats,
  getMonthlyInsight,
  getAllTimeInsight 
};