const router = require("express").Router();
const ctrl   = require("../controllers/habitController");
const auth   = require("../middleware/auth");

router.get("/:userId",              ctrl.getHabits);
router.get("/:userId/suggest",      ctrl.getSuggestion);
router.post("/",              auth, ctrl.createHabit);
router.patch("/:habitId/check", auth, ctrl.checkOff);

module.exports = router;