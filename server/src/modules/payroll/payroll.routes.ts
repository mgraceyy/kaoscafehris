import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  adjustPayslipSchema,
  createPayrollRunSchema,
} from "./payroll.schema.js";
import * as payrollController from "./payroll.controller.js";

const router = Router();

// All routes require authentication. Admin gating is applied per-route so
// employees can reach their own payslip list + PDF download.
router.use(authenticate);

// --- Self-accessible -------------------------------------------------------
router.get("/my-payslips", payrollController.listMyPayslips);
router.get("/my-payslips/:id", payrollController.getMyPayslipDetail);
// Self or ADMIN (access check inside controller).
router.get("/payslips/:id/pdf", payrollController.getPayslipPdf);

// --- Admin-only ------------------------------------------------------------
router.get("/runs", authorize("ADMIN"), payrollController.listRuns);
router.post(
  "/runs",
  authorize("ADMIN"),
  validate(createPayrollRunSchema),
  payrollController.createRun
);
router.get("/runs/:id", authorize("ADMIN"), payrollController.getRunById);
router.post(
  "/runs/:id/process",
  authorize("ADMIN"),
  payrollController.processRun
);
router.patch(
  "/runs/:id/complete",
  authorize("ADMIN"),
  payrollController.completeRun
);
router.delete("/runs/:id", authorize("ADMIN"), payrollController.cancelRun);
router.get("/runs/:id/pdf", authorize("ADMIN"), payrollController.getRunPdf);
router.get("/runs/:id/xlsx", authorize("ADMIN"), payrollController.getRunXlsx);

router.get("/payslips/:id", authorize("ADMIN"), payrollController.getPayslip);
router.put(
  "/payslips/:id",
  authorize("ADMIN"),
  validate(adjustPayslipSchema),
  payrollController.adjustPayslip
);

export default router;
