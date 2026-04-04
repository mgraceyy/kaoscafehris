import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

// GET    /api/payroll/runs                    — list payroll runs
// POST   /api/payroll/runs                    — create payroll run
// GET    /api/payroll/runs/:id                — get run details with payslip summaries
// POST   /api/payroll/runs/:id/process        — compute all payslips
// PATCH  /api/payroll/runs/:id/complete       — finalize payroll run
// DELETE /api/payroll/runs/:id                — cancel draft run
// GET    /api/payroll/payslips/:id            — get full payslip detail
// PUT    /api/payroll/payslips/:id            — manually adjust payslip
// GET    /api/payroll/payslips/:id/pdf        — download payslip PDF

router.get("/runs", /* payrollController.listRuns */);
router.post("/runs", /* payrollController.createRun */);
router.get("/runs/:id", /* payrollController.getRunById */);
router.post("/runs/:id/process", /* payrollController.processRun */);
router.patch("/runs/:id/complete", /* payrollController.completeRun */);
router.delete("/runs/:id", /* payrollController.cancelRun */);
router.get("/payslips/:id", /* payrollController.getPayslip */);
router.put("/payslips/:id", /* payrollController.adjustPayslip */);
router.get("/payslips/:id/pdf", /* payrollController.downloadPayslipPdf */);

export default router;
