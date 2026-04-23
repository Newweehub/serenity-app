import { containers } from './cosmosClient.js';

/**
 * Journal Repository
 * Raw Cosmos DB access for the journals container.
 */

export const journalRepository = {
  async findById(id, userId) {
    try {
      const { resource } = await containers.journals().item(id, userId).read();
      return resource ?? null;
    } catch (err) {
      if (err.code === 404) return null;
      throw err;
    }
  },

  async save(entry) {
    const { resource } = await containers.journals().items.upsert(entry);
    return resource;
  },

  async findByUser(userId, { limit = 20, offset = 0 } = {}) {
    const { resources } = await containers.journals().items.query({
      query: `
        SELECT * FROM c
        WHERE c.userId = @userId
        ORDER BY c.createdAt DESC
        OFFSET @offset LIMIT @limit
      `,
      parameters: [
        { name: '@userId', value: userId },
        { name: '@offset', value: offset },
        { name: '@limit',  value: limit  },
      ],
    }).fetchAll();
    return resources;
  },

  async findRecentThemes(userId, sinceDaysAgo = 7) {
    const since = new Date(Date.now() - sinceDaysAgo * 86_400_000).toISOString();
    const { resources } = await containers.journals().items.query({
      query: `
        SELECT c.aiAnalysis.themes
        FROM c
        WHERE c.userId = @userId AND c.createdAt >= @since
      `,
      parameters: [
        { name: '@userId', value: userId },
        { name: '@since',  value: since  },
      ],
    }).fetchAll();
    return resources.flatMap(r => r.themes ?? []);
  },

  async findRecentMoodScores(userId, sinceDaysAgo = 7) {
    const since = new Date(Date.now() - sinceDaysAgo * 86_400_000).toISOString();
    const { resources } = await containers.journals().items.query({
      query: `
        SELECT c.content.moodScore, c.createdAt
        FROM c
        WHERE c.userId = @userId AND c.createdAt >= @since
        ORDER BY c.createdAt ASC
      `,
      parameters: [
        { name: '@userId', value: userId },
        { name: '@since',  value: since  },
      ],
    }).fetchAll();
    return resources;
  },

  async markSearchIndexed(id, userId) {
    await containers.journals().item(id, userId).patch([
      { op: 'replace', path: '/searchIndexed', value: true },
    ]);
  },
};