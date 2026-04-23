import { containers } from './cosmosClient.js';

/**
 * User Repository
 * Raw Cosmos DB access for the users container.
 * No business logic here — only data access.
 */

export const userRepository = {
  async findById(userId) {
    try {
      const { resource } = await containers.users().item(userId, userId).read();
      return resource ?? null;
    } catch (err) {
      if (err.code === 404) return null;
      throw err;
    }
  },

  async upsert(user) {
    const { resource } = await containers.users().items.upsert(user);
    return resource;
  },

  async findOrCreate(userId, defaults) {
    const existing = await userRepository.findById(userId);
    if (existing) return existing;
    return userRepository.upsert({ ...defaults, id: userId, userId });
  },
};