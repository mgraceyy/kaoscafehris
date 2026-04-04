import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

// GET /api/audit-logs          — query audit trail (filterable, paginated)
// GET /api/audit-logs/:id      — get single audit log entry

router.get("/", /* auditLogController.list */);
router.get("/:id", /* auditLogController.getById */);

export default router;
