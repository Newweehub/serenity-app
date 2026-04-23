import { containers } from './cosmosClient.js';

/**
 * Habit Repository
 * Raw Cosmos DB access for the habits container.
 */

export const habitRepository = {
  async findById(id, userId) {
    try {
      const { resource } = await containers.habits().item(id, userId).read();
      return resource ?? null;
    } catch (err) {
      if (err.code === 404) return null;
      throw err;
    }
  },

  async save(habit) {
    const { resource } = await containers.habits().items.upsert(habit);
    return resource;
  },

  async findActiveByUser(userId) {
    const { resources } = await containers.habits().items.query({
      query: `
        SELECT * FROM c
        WHERE c.userId = @userId AND c.status = 'active'
        ORDER BY c.createdAt ASC
      `,
      parameters: [{ name: '@userId', value: userId }],
    }).fetchAll();
    return resources;
  },

  async findAllByUser(userId) {
    const { resources } = await containers.habits().items.query({
      query: `SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt ASC`,
      parameters: [{ name: '@userId', value: userId }],
    }).fetchAll();
    return resources;
  },

  async delete(id, userId) {
    await containers.habits().item(id, userId).delete();
  },
};