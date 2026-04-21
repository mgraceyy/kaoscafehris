import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  createOvertimeSchema,
  reviewOvertimeSchema,
  approveShiftOvertimeSchema,
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

export default router;
