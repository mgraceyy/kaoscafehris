import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

// GET    /api/settings                          — list all settings
// PUT    /api/settings/:key                     — update single setting
// PUT    /api/settings                          — bulk update settings
// GET    /api/settings/government-tables        — list contribution tables
// POST   /api/settings/government-tables        — create/replace table entries
// DELETE /api/settings/government-tables/:id    — delete table entry

router.get("/government-tables", /* settingsController.getGovernmentTables */);
router.post("/government-tables", /* settingsController.upsertGovernmentTable */);
router.delete("/government-tables/:id", /* settingsController.deleteGovernmentEntry */);
router.get("/", /* settingsController.list */);
router.put("/", /* settingsController.bulkUpdate */);
router.put("/:key", /* settingsController.updateByKey */);

export default router;
