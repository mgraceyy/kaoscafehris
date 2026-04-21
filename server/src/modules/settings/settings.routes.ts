import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  bulkUpdateSchema,
  updateSettingSchema,
  upsertGovTableSchema,
} from "./settings.schema.js";
import * as settingsController from "./settings.controller.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/government-tables", settingsController.getGovernmentTables);
router.post(
  "/government-tables",
  validate(upsertGovTableSchema),
  settingsController.upsertGovernmentTable
);
router.delete("/government-tables/:id", settingsController.deleteGovernmentEntry);

router.get("/", settingsController.list);
router.put("/", validate(bulkUpdateSchema), settingsController.bulkUpdate);
router.put(
  "/:key",
  validate(updateSettingSchema),
  settingsController.updateByKey
);

export default router;
