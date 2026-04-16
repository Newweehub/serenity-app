const router = require("express").Router();
const ctrl   = require("../controllers/journalController");
const auth   = require("../middleware/auth");

router.get("/",          auth, ctrl.getEntries);
router.get("/:userId",   ctrl.getEntries);
router.post("/",         auth, ctrl.createEntry);

module.exports = router;