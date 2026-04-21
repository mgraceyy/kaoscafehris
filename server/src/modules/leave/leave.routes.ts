import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  createLeaveRequestSchema,
  reviewLeaveSchema,
  upsertLeaveBalanceSchema,
} from "./leave.schema.js";
import * as leaveController from "./leave.controller.js";

const router = Router();

router.use(authenticate);

router.get("/requests", leaveController.listRequests);
router.get("/requests/:id", leaveController.getRequest);
router.post(
  "/requests",
  validate(createLeaveRequestSchema),
  leaveController.createRequest
);
router.patch(
  "/requests/:id/review",
  authorize("ADMIN", "MANAGER"),
  validate(reviewLeaveSchema),
  leaveController.reviewRequest
);
router.patch("/requests/:id/cancel", leaveController.cancelRequest);

router.get("/balances", leaveController.listBalances);
router.put(
  "/balances",
  authorize("ADMIN"),
  validate(upsertLeaveBalanceSchema),
  leaveController.upsertBalance
);

export default router;
