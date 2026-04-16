const router = require("express").Router();
const ctrl   = require("../controllers/insightsController");

router.get("/:userId",        ctrl.getWeeklyInsight);
router.get("/:userId/stats",  ctrl.getStats);

module.exports = router;