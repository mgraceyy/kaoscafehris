import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createBranchSchema, updateBranchSchema } from "./branch.schema.js";
import * as branchController from "./branch.controller.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/", branchController.list);
router.get("/:id", branchController.getById);
router.post("/", validate(createBranchSchema), branchController.create);
router.put("/:id", validate(updateBranchSchema), branchController.update);
router.delete("/:id", branchController.deactivate);

export default router;
