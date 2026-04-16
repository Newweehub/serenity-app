const orchestrator = require("../agents/orchestrator");
const contextSvc   = require("../services/contextService");
const journalAgent = require("../agents/journalAgent");

async function chat(req, res, next) {
  try {
    const { userId, message, mood, history } = req.body;
    const result = await orchestrator.route(
      userId, message, mood, history || []
    );
    res.json(result);
  } catch (err) { next(err); }
}

async function moodCheckin(req, res, next) {
  try {
    const { userId, mood } = req.body;
    await contextSvc.logMood(userId, mood);
    const context = await contextSvc.getContext(userId);
    const message = await journalAgent.getOpeningQuestion(userId);
    res.json({ message, mood, context });
  } catch (err) { next(err); }
}

module.exports = { chat, moodCheckin };