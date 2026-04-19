const orchestrator  = require("../agents/orchestrator");
const contextSvc    = require("../services/contextService");
const journalAgent  = require("../agents/journalAgent");
const journalSvc    = require("../services/journalService");

async function chat(req, res, next) {
  try {
    const { userId, message, mood, history, tzOffset } = req.body;

    // Attach tzOffset to request for service layer
    req.tzOffset = tzOffset || 0;

    // Save user message — don't fail the whole request if this fails
    try {
      await journalSvc.appendMessage(userId, "user", message, tzOffset);
    } catch (saveErr) {
      console.warn("[Chat] Could not save user message:", saveErr.message);
    }

    const result = await orchestrator.route(
      userId, message, mood, history || []
    );

    const aiContent = result.response?.content || "";

    // Save AI response — don't fail if this fails
    try {
      if (aiContent) {
        await journalSvc.appendMessage(userId, "ai", aiContent);
      }
    } catch (saveErr) {
      console.warn("[Chat] Could not save AI message:", saveErr.message);
    }

    // Update metadata
    if (result.agent === "journal") {
      try {
        await journalSvc.updateTodayMeta(
          userId,
          result.response?.emotion,
          result.response?.themes
        );
      } catch (metaErr) {
        console.warn("[Chat] Could not update metadata:", metaErr.message);
      }
    }

    res.json(result);
  } catch (err) {
    console.error("[Chat] Fatal error:", err.message, err.stack);
    next(err);
  }
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