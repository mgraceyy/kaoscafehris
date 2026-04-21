import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import * as reportController from "./report.controller.js";

const router = Router();

router.use(authenticate, authorize("ADMIN", "MANAGER"));

router.get("/attendance", reportController.attendanceSummary);
router.get("/payroll", reportController.payrollSummary);
router.get("/headcount", reportController.headcount);
router.get("/export/:type", reportController.exportReport);

export default router;
