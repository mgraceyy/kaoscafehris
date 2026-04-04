import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate, authorize("ADMIN", "MANAGER"));

// GET /api/reports/attendance             — attendance summary report
// GET /api/reports/payroll                — payroll summary report
// GET /api/reports/headcount              — headcount by branch/position
// GET /api/reports/export/:type           — export report as Excel/PDF

router.get("/attendance", /* reportController.attendanceSummary */);
router.get("/payroll", /* reportController.payrollSummary */);
router.get("/headcount", /* reportController.headcount */);
router.get("/export/:type", /* reportController.exportReport */);

export default router;
