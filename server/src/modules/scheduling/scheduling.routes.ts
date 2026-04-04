import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate, authorize("ADMIN", "MANAGER"));

// GET    /api/scheduling/shifts                              — list shifts by branch + date range
// POST   /api/scheduling/shifts                              — create shift
// POST   /api/scheduling/shifts/bulk                         — create multiple shifts
// PUT    /api/scheduling/shifts/:id                          — update shift (DRAFT only)
// DELETE /api/scheduling/shifts/:id                          — delete shift (DRAFT only)
// POST   /api/scheduling/shifts/:id/assignments              — assign employees to shift
// DELETE /api/scheduling/shifts/:shiftId/assignments/:employeeId — remove assignment
// PATCH  /api/scheduling/shifts/:id/publish                  — publish a draft shift

router.get("/shifts", /* schedulingController.listShifts */);
router.post("/shifts", /* schedulingController.createShift */);
router.post("/shifts/bulk", /* schedulingController.createBulk */);
router.put("/shifts/:id", /* schedulingController.updateShift */);
router.delete("/shifts/:id", /* schedulingController.deleteShift */);
router.post("/shifts/:id/assignments", /* schedulingController.assignEmployees */);
router.delete("/shifts/:shiftId/assignments/:employeeId", /* schedulingController.removeAssignment */);
router.patch("/shifts/:id/publish", /* schedulingController.publishShift */);

export default router;
