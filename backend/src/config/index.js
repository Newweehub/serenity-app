// All environment variables validated and exported from one place.
// The rest of the app imports from here, never from process.env directly.

function required(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key, fallback = '') {
  return process.env[key] ?? fallback;
}

export const config = {
  app: {
    port: optional('PORT', '3001'),
    env: optional('NODE_ENV', 'development'),
    isDev: optional('NODE_ENV', 'development') === 'development',
  },

  cosmos: {
    endpoint: required('AZURE_COSMOS_ENDPOINT'),
    key:      required('AZURE_COSMOS_KEY'),
    database: optional('COSMOS_DATABASE_NAME', 'serenity'),
    containers: {
      users:    'users',
      journals: 'journals',
      habits:   'habits',
    },
  },

  search: {
    endpoint:  required('AZURE_SEARCH_ENDPOINT'),
    key:       required('AZURE_SEARCH_KEY'),
    indexName: optional('AZURE_SEARCH_INDEX', 'journal-entries'),
  },

  openai: {
    endpoint:   required('AZURE_FOUNDRY_ENDPOINT'),
    apiKey:     required('AZURE_FOUNDRY_API_KEY'),
    deployment: optional('AZURE_OPENAI_DEPLOYMENT', 'gpt-4.1-mini'),
    apiVersion: optional('AZURE_OPENAI_API_VERSION', '2024-12-01-preview'),
  },
};
