const { CosmosClient } = require("@azure/cosmos");
require("dotenv").config();

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key:      process.env.COSMOS_KEY
});

const db = client.database(process.env.COSMOS_DATABASE);

// Generic helpers used by all agents
async function getItem(container, userId, id) {
  try {
    const { resource } = await db
      .container(container)
      .item(id, userId)
      .read();
    return resource;
  } catch {
    return null;
  }
}

async function upsertItem(container, item) {
  const { resource } = await db
    .container(container)
    .items.upsert(item);
  return resource;
}

async function queryItems(container, query, parameters = []) {
  const { resources } = await db
    .container(container)
    .items.query({ query, parameters })
    .fetchAll();
  return resources;
}

async function deleteItem(container, userId, id) {
  await db.container(container).item(id, userId).delete();
}

module.exports = { getItem, upsertItem, queryItems, deleteItem };