const { db } = require("../config/db");

const CONTAINER = "users";

async function findById(userId) {
  try {
    const { resource } = await db
      .container(CONTAINER)
      .item(userId, userId)
      .read();
    return resource || null;
  } catch {
    return null;
  }
}

async function upsert(user) {
  const { resource } = await db
    .container(CONTAINER)
    .items.upsert(user);
  return resource;
}

module.exports = { findById, upsert };