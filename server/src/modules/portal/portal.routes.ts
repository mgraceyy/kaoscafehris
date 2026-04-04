import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate);

// GET    /api/portal/profile                — get own profile
// PUT    /api/portal/profile                — update own profile (limited fields)
// POST   /api/portal/profile/photo          — upload profile photo
// PUT    /api/portal/password               — change own password
// GET    /api/portal/schedule               — get own shift schedule
// GET    /api/portal/attendance             — get own attendance history
// GET    /api/portal/payslips               — list own payslips
// GET    /api/portal/payslips/:id           — get own payslip detail
// GET    /api/portal/payslips/:id/pdf       — download own payslip PDF
// GET    /api/portal/leave                  — list own leave requests + balances
// POST   /api/portal/leave                  — submit own leave request
// PATCH  /api/portal/leave/:id/cancel       — cancel own pending leave

router.get("/profile", /* portalController.getProfile */);
router.put("/profile", /* portalController.updateProfile */);
router.post("/profile/photo", /* portalController.uploadPhoto */);
router.put("/password", /* portalController.changePassword */);
router.get("/schedule", /* portalController.getSchedule */);
router.get("/attendance", /* portalController.getAttendance */);
router.get("/payslips", /* portalController.listPayslips */);
router.get("/payslips/:id", /* portalController.getPayslip */);
router.get("/payslips/:id/pdf", /* portalController.downloadPayslipPdf */);
router.get("/leave", /* portalController.getLeave */);
router.post("/leave", /* portalController.submitLeave */);
router.patch("/leave/:id/cancel", /* portalController.cancelLeave */);

export default router;
