const { SearchClient, AzureKeyCredential } = require("@azure/search-documents");
require("dotenv").config();

const searchClient = new SearchClient(
  process.env.SEARCH_ENDPOINT,
  process.env.SEARCH_INDEX,
  new AzureKeyCredential(process.env.SEARCH_KEY)
);

// Save a journal entry to the search index
async function indexJournalEntry(entry) {
  await searchClient.uploadDocuments([{
    id:       entry.id,
    userId:   entry.userId,
    text:     entry.text,
    emotions: entry.emotions.join(", "),
    themes:   entry.themes.join(", "),
    date:     entry.date
  }]);
}

// Search past journal entries semantically
async function searchJournals(userId, query, top = 3) {
  const results = await searchClient.search(query, {
    filter:  `userId eq '${userId}'`,
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

module.exports = { indexJournalEntry, searchJournals };