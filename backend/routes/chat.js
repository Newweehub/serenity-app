const router = require("express").Router();
const ctrl   = require("../controllers/chatController");
const auth   = require("../middleware/auth");

router.post("/",      auth, ctrl.chat);
router.post("/mood",  auth, ctrl.moodCheckin);

module.exports = router;