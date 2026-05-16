import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { authorizePermission } from "../../middleware/permission.js";
import { validate } from "../../middleware/validate.js";
import {
  assignEmployeesSchema,
  createShiftSchema,
  updateShiftSchema,
} from "./scheduling.schema.js";
import * as schedulingController from "./scheduling.controller.js";
import shiftTypeRoutes from "./shift-type.routes.js";
import { generateShiftsSchema } from "./generate-shifts.schema.js";
import { generateShifts } from "./generate-shifts.service.js";

const router = Router();

router.use(authenticate, authorize("ADMIN", "MANAGER"));

router.get("/shifts", schedulingController.listShifts);
router.get("/shifts/:id", schedulingController.getShift);
router.post(
  "/shifts",
  authorizePermission("schedule", "create"),
  validate(createShiftSchema),
  schedulingController.createShift
);
router.put(
  "/shifts/:id",
  authorizePermission("schedule", "edit"),
  validate(updateShiftSchema),
  schedulingController.updateShift
);
router.delete(
  "/shifts/:id",
  authorizePermission("schedule", "delete"),
  schedulingController.deleteShift
);

router.post(
  "/shifts/:id/assignments",
  authorizePermission("schedule", "create"),
  validate(assignEmployeesSchema),
  schedulingController.assignEmployees
);
router.delete(
  "/shifts/:id/assignments/:employeeId",
  authorizePermission("schedule", "delete"),
  schedulingController.unassignEmployee
);

router.use("/shift-types", shiftTypeRoutes);

// Generate shifts based on employee default shifts
router.post(
  "/generate",
  authorize("ADMIN"),
  validate(generateShiftsSchema),
  async (req, res, next) => {
    try {
      const result = await generateShifts(req.body, req.user?.userId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
