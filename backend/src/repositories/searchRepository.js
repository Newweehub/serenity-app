import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { config } from '../config/index.js';

/**
 * Search Repository
 * Wraps Azure AI Search for journal entry indexing and recall.
 */

const searchClient = new SearchClient(
  config.search.endpoint,
  config.search.indexName,
  new AzureKeyCredential(config.search.key)
);

export const searchRepository = {
  /**
   * Index a journal entry so it becomes searchable.
   * Called after saving a journal entry to Cosmos.
   */
  async indexEntry(entry) {
    const doc = {
      id:       entry.id,
      userId:   entry.userId,
      text:     entry.content.freeText,
      emotions: (entry.aiAnalysis?.emotions ?? []).join(', '),
      themes:   (entry.aiAnalysis?.themes   ?? []).join(', '),
      summary:  entry.aiAnalysis?.summary   ?? '',
      date:     entry.createdAt,
    };

    await searchClient.uploadDocuments([doc]);
  },

  /**
   * Semantic search over journals for a specific user.
   * Returns matched entries ordered by relevance.
   */
  async search(userId, query, { top = 5 } = {}) {
    const results = [];

    const searchResults = await searchClient.search(query, {
      filter: `userId eq '${userId}'`,
      top,
      select: ['id', 'text', 'emotions', 'themes', 'summary', 'date'],
    });

    for await (const result of searchResults.results) {
      results.push(result.document);
    }

    return results;
  },

  /**
   * Delete a journal entry from the search index.
   */
  async deleteEntry(entryId) {
    await searchClient.deleteDocuments([{ id: entryId }]);
  },
};
