const userRepo       = require("../repositories/userRepository");
const { v4: uuidv4 } = require("uuid");

async function login(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const userId = name.toLowerCase().replace(/\s+/g, "-");
    let user     = await userRepo.findById(userId);

    if (!user) {
      user = {
        id: userId, userId, name,
        mood: null,
        goals: ["reduce anxiety", "build healthy habits"],
        streakDays: 0,
        createdAt: new Date().toISOString()
      };
      await userRepo.upsert(user);
    }

    res.json({ userId, name: user.name, streakDays: user.streakDays });
  } catch (err) { next(err); }
}

module.exports = { login };