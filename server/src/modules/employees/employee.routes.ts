import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate);

// GET    /api/employees                    — list employees (filterable, paginated)
// GET    /api/employees/:id                — get full employee profile
// POST   /api/employees                    — create employee + user account
// PUT    /api/employees/:id                — update employee profile
// DELETE /api/employees/:id                — deactivate employee
// POST   /api/employees/import             — bulk import via CSV
// GET    /api/employees/import/template    — download CSV template

router.get("/import/template", authorize("ADMIN", "MANAGER"), /* employeeController.downloadTemplate */);
router.post("/import", authorize("ADMIN"), /* employeeController.importCsv */);
router.get("/", authorize("ADMIN", "MANAGER"), /* employeeController.list */);
router.get("/:id", authorize("ADMIN", "MANAGER"), /* employeeController.getById */);
router.post("/", authorize("ADMIN"), /* employeeController.create */);
router.put("/:id", authorize("ADMIN", "MANAGER"), /* employeeController.update */);
router.delete("/:id", authorize("ADMIN"), /* employeeController.deactivate */);

export default router;
