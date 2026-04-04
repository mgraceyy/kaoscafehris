import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate);

// GET    /api/leave/requests                  — list leave requests (filterable)
// GET    /api/leave/requests/:id              — get single request
// POST   /api/leave/requests                  — submit leave request
// PATCH  /api/leave/requests/:id/review       — approve/reject (ADMIN, MANAGER)
// PATCH  /api/leave/requests/:id/cancel       — cancel own pending request
// GET    /api/leave/balances/:employeeId      — get leave balances
// PUT    /api/leave/balances/:employeeId      — set/update leave balances (ADMIN)

router.get("/requests", /* leaveController.listRequests */);
router.get("/requests/:id", /* leaveController.getRequestById */);
router.post("/requests", /* leaveController.submitRequest */);
router.patch("/requests/:id/review", authorize("ADMIN", "MANAGER"), /* leaveController.reviewRequest */);
router.patch("/requests/:id/cancel", /* leaveController.cancelRequest */);
router.get("/balances/:employeeId", /* leaveController.getBalances */);
router.put("/balances/:employeeId", authorize("ADMIN"), /* leaveController.updateBalances */);

export default router;
