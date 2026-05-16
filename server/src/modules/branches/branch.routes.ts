import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { authorizePermission } from "../../middleware/permission.js";
import { validate } from "../../middleware/validate.js";
import { createBranchSchema, updateBranchSchema } from "./branch.schema.js";
import * as branchController from "./branch.controller.js";

const router = Router();

router.use(authenticate, authorize("ADMIN", "MANAGER"));

router.get("/", authorizePermission("branches", "view"), branchController.list);
router.get("/:id", authorizePermission("branches", "view"), branchController.getById);
router.post("/", authorize("ADMIN"), validate(createBranchSchema), branchController.create);
router.put("/:id", authorizePermission("branches", "edit"), validate(updateBranchSchema), branchController.update);
router.delete("/:id", authorize("ADMIN"), branchController.deactivate);

export default router;
