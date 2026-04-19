const { db }           = require("../config/db");
const { searchClient } = require("../config/db");

const CONTAINER = "journals";

async function findByUser(userId, limit = 10) {
  const { resources } = await db
    .container(CONTAINER)
    .items.query({
      query: `SELECT * FROM c WHERE c.userId = @userId
              ORDER BY c.date DESC OFFSET 0 LIMIT @limit`,
      parameters: [
        { name: "@userId", value: userId },
        { name: "@limit",  value: limit  }
      ]
    }).fetchAll();
  return resources;
}

async function findByUserSince(userId, since) {
  const { resources } = await db
    .container(CONTAINER)
    .items.query({
      query: `SELECT * FROM c WHERE c.userId = @userId
              AND c.date >= @since`,
      parameters: [
        { name: "@userId", value: userId },
        { name: "@since",  value: since  }
      ]
    }).fetchAll();
  return resources;
}

async function create(entry) {
  const { resource } = await db
    .container(CONTAINER)
    .items.upsert(entry);
  return resource;
}

// Index in AI Search for semantic retrieval
async function indexEntry(entry) {
  await searchClient.uploadDocuments([{
    id:       entry.id,
    userId:   entry.userId,
    text:     entry.text,
    emotions: entry.emotions.join(", "),
    themes:   entry.themes.join(", "),
    date:     entry.date
  }]);
}

// Semantic search over past entries
async function searchByMeaning(userId, query, top = 3) {
  const results = await searchClient.search(query, {
    filter:    `userId eq '${userId}'`,
    top,
    queryType: "semantic",
    semanticSearchOptions: { configurationName: "default" }
  });
  const entries = [];
  for await (const result of results.results) {
    entries.push(result.document);
  }
  return entries;
}

async function findById(userId, id) {
  try {
    const { resource } = await db
      .container(CONTAINER)
      .item(id, userId)
      .read();
    return resource || null;
  } catch {
    return null;
  }
}

async function getEntriesSince(userId, since) {
  const { resources } = await db
    .container(CONTAINER)
    .items.query({
      query: `SELECT * FROM c WHERE c.userId = @userId
              AND c.date >= @since ORDER BY c.date DESC`,
      parameters: [
        { name: "@userId", value: userId },
        { name: "@since",  value: since  }
      ]
    }).fetchAll();
  return resources;
}

// add to exports
module.exports = {
  findByUser, findByUserSince, findById,
  getEntriesSince,   // ← add
  create, indexEntry, searchByMeaning
};