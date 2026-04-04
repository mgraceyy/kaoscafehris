import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();

// POST /api/attendance/clock-in         — kiosk clock-in with selfie
// POST /api/attendance/clock-out        — kiosk clock-out with selfie
// POST /api/attendance/sync             — batch sync offline records
// GET  /api/attendance                  — list attendance records (admin/manager)
// GET  /api/attendance/:id              — get single record
// PUT  /api/attendance/:id              — manually correct a record (admin)

router.post("/clock-in", /* attendanceController.clockIn */);
router.post("/clock-out", /* attendanceController.clockOut */);
router.post("/sync", /* attendanceController.syncOffline */);
router.get("/", authenticate, authorize("ADMIN", "MANAGER"), /* attendanceController.list */);
router.get("/:id", authenticate, authorize("ADMIN", "MANAGER"), /* attendanceController.getById */);
router.put("/:id", authenticate, authorize("ADMIN"), /* attendanceController.correct */);

export default router;
