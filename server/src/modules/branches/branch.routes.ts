import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

// GET    /api/branches          — list all branches
// GET    /api/branches/:id      — get single branch
// POST   /api/branches          — create branch
// PUT    /api/branches/:id      — update branch
// DELETE /api/branches/:id      — deactivate branch

router.get("/", /* branchController.list */);
router.get("/:id", /* branchController.getById */);
router.post("/", /* branchController.create */);
router.put("/:id", /* branchController.update */);
router.delete("/:id", /* branchController.deactivate */);

export default router;
