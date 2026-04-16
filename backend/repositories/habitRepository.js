const { db } = require("../config/db");

const CONTAINER = "habits";

async function findByUser(userId) {
  const { resources } = await db
    .container(CONTAINER)
    .items.query({
      query: `SELECT * FROM c WHERE c.userId = @userId
              AND c.active = true ORDER BY c.createdAt DESC`,
      parameters: [{ name: "@userId", value: userId }]
    }).fetchAll();
  return resources;
}

async function findById(userId, habitId) {
  const { resources } = await db
    .container(CONTAINER)
    .items.query({
      query: `SELECT * FROM c WHERE c.id = @id
              AND c.userId = @userId`,
      parameters: [
        { name: "@id",     value: habitId },
        { name: "@userId", value: userId  }
      ]
    }).fetchAll();
  return resources[0] || null;
}

async function upsert(habit) {
  const { resource } = await db
    .container(CONTAINER)
    .items.upsert(habit);
  return resource;
}

module.exports = { findByUser, findById, upsert };