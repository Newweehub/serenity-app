import { searchRepository } from '../repositories/searchRepository.js';

/**
 * Search a user's journal entries semantically.
 */
export async function searchJournals(userId, query, { top = 5 } = {}) {
  if (!query?.trim()) return [];
  return searchRepository.search(userId, query, { top });
}
