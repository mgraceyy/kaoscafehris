import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import * as auditLogController from "./audit-log.controller.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/tables", auditLogController.getTables);
router.get("/", auditLogController.list);
router.get("/:id", auditLogController.getById);

export default router;
