import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/index.js';

// Singleton client — created once, reused across all repositories
const client = new CosmosClient({
  endpoint: config.cosmos.endpoint,
  key: config.cosmos.key,
});

const db = client.database(config.cosmos.database);

export const containers = {
  users:    () => db.container(config.cosmos.containers.users),
  journals: () => db.container(config.cosmos.containers.journals),
  habits:   () => db.container(config.cosmos.containers.habits),
  pushSubscriptions: () => db.container('pushSubscriptions'),
};
