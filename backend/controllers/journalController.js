const journalSvc = require("../services/journalService");

async function getEntries(req, res, next) {
  try {
    const entries = await journalSvc.getPastEntries(req.params.userId);
    res.json(entries);
  } catch (err) { next(err); }
}

async function createEntry(req, res, next) {
  try {
    const { userId, text, emotion, themes } = req.body;
    const entry = await journalSvc.saveEntry(userId, text, emotion, themes);
    res.status(201).json(entry);
  } catch (err) { next(err); }
}

module.exports = { getEntries, createEntry };