const router = require("express").Router();
const ctrl   = require("../controllers/insightsController");

router.get("/:userId",        ctrl.getWeeklyInsight);
router.get("/:userId/stats",  ctrl.getStats);
router.get("/:userId/monthly", ctrl.getMonthlyInsight);
router.get("/:userId/alltime", ctrl.getAllTimeInsight);

module.exports = router;