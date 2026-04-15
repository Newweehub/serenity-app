const { chat }              = require("../services/llm");
const { upsertItem, queryItems } = require("../services/cosmos");
const { indexJournalEntry, searchJournals } = require("../services/search");
const { updateContext }     = require("./contextAgent");
const { v4: uuidv4 }        = require("uuid");

const SYSTEM_PROMPT = `
You are a warm, supportive journaling coach named Sage.
Your role is to help users reflect on their thoughts and feelings.

Rules you must always follow:
- Ask only ONE question at a time — never multiple questions
- Be warm and empathetic, never clinical or prescriptive
- Validate feelings before asking anything
- Never give advice unless explicitly asked
- Keep responses concise — 2-4 sentences maximum
- If the user seems distressed, prioritize emotional support over reflection
- Detect the dominant emotion in the user's message (one of: calm, anxious,
  excited, sad, tired, hopeful, frustrated, grateful, overwhelmed, content)
- End your response with a JSON block like this on its own line:
  {"emotion": "anxious", "themes": ["work", "stress"]}
`;

// Generate opening question based on user context
async function getOpeningQuestion(userId, context) {
  const { mood, lastJournal, dominantEmotion, goals, recurringThemes } = context;

  // Fetch relevant past entries for richer context
  let pastContext = "";
  if (lastJournal) {
    const pastEntries = await searchJournals(userId, lastJournal, 2);
    if (pastEntries.length > 0) {
      pastContext = `Recent journal themes: ${pastEntries
        .map(e => e.themes).join(", ")}`;
    }
  }

  const contextMessage = `
    User mood today: ${mood || "unknown"}
    Last dominant emotion: ${dominantEmotion || "unknown"}
    Recurring themes: ${recurringThemes?.join(", ") || "none yet"}
    User goals: ${goals?.join(", ") || "not set"}
    ${pastContext}
    
    Generate a warm opening journaling question tailored to this context.
    Do not mention you have this data — just let it naturally inform your question.
  `;

  const raw = await chat(SYSTEM_PROMPT, contextMessage);
  return extractContent(raw);
}

// Process a journal message and return AI response
async function processMessage(userId, message, history = []) {
  const raw     = await chat(SYSTEM_PROMPT, message, history);
  const content = extractContent(raw);
  const meta    = extractMeta(raw);

  return { content, emotion: meta.emotion, themes: meta.themes };
}

// Save completed journal entry
async function saveEntry(userId, text, emotion, themes) {
  const entry = {
    id:       uuidv4(),
    userId,
    text,
    emotions: emotion ? [emotion] : [],
    themes:   themes  || [],
    date:     new Date().toISOString()
  };

  // Save to Cosmos DB
  await upsertItem("journals", entry);

  // Index in AI Search for future pattern retrieval
  await indexJournalEntry(entry);

  // Update user context
  await updateContext(userId, {
    lastJournal:     text.substring(0, 200),
    lastJournalDate: entry.date,
    dominantEmotion: emotion,
    recurringThemes: themes
  });

  return entry;
}

// Get past journal entries for a user
async function getPastEntries(userId, limit = 10) {
  return await queryItems(
    "journals",
    "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.date DESC OFFSET 0 LIMIT @limit",
    [{ name: "@userId", value: userId },
     { name: "@limit",  value: limit }]
  );
}

// Strip the JSON metadata block from the LLM response
function extractContent(raw) {
  return raw.replace(/\{"emotion".*?\}/s, "").trim();
}

// Parse the JSON metadata block from the LLM response
function extractMeta(raw) {
  try {
    const match = raw.match(/\{\"emotion\".*?\}/s);
    return match ? JSON.parse(match[0]) : { emotion: "calm", themes: [] };
  } catch {
    return { emotion: "calm", themes: [] };
  }
}

module.exports = {
  getOpeningQuestion,
  processMessage,
  saveEntry,
  getPastEntries
};