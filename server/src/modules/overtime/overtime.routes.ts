import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  createOvertimeSchema,
  reviewOvertimeSchema,
  approveShiftOvertimeSchema,
  createScheduleSchema,
  updateScheduleSchema,
} from "./overtime.schema.js";
import * as overtimeController from "./overtime.controller.js";

const router = Router();
router.use(authenticate);

// Any authenticated user can list (scoped server-side for EMPLOYEE)
router.get("/", overtimeController.list);

// Employee submits a request
router.post("/", validate(createOvertimeSchema), overtimeController.create);

// Manager/Admin reviews a request
router.patch(
  "/:id/review",
  authorize("ADMIN", "MANAGER"),
  validate(reviewOvertimeSchema),
  overtimeController.review
);

// Manager/Admin toggles pre-approved overtime on a specific shift assignment
router.patch(
  "/shift/:shiftId/employee/:employeeId",
  authorize("ADMIN", "MANAGER"),
  validate(approveShiftOvertimeSchema),
  overtimeController.setShiftOvertime
);

// Overtime schedules (admin/manager pre-assign)
router.get("/schedules", authorize("ADMIN", "MANAGER"), overtimeController.listSchedules);
router.post(
  "/schedules",
  authorize("ADMIN", "MANAGER"),
  validate(createScheduleSchema),
  overtimeController.createSchedule
);
router.patch(
  "/schedules/:id",
  authorize("ADMIN", "MANAGER"),
  validate(updateScheduleSchema),
  overtimeController.updateSchedule
);
router.delete(
  "/schedules/:id",
  authorize("ADMIN", "MANAGER"),
  overtimeController.deleteSchedule
);

export default router;
