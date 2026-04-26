import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  createShiftType,
  deleteShiftType,
  getShiftTypeById,
  listShiftTypes,
  updateShiftType,
} from "./shift-type.service.js";
import {
  createShiftTypeSchema,
  listShiftTypesQuerySchema,
  updateShiftTypeSchema,
} from "./shift-type.schema.js";

const router = Router();

router.use(authenticate, authorize("ADMIN", "MANAGER"));

// List shift types (optionally filtered by branchId)
router.get("/", async (req, res, next) => {
  try {
    const query = listShiftTypesQuerySchema.parse(req.query);
    const shiftTypes = await listShiftTypes(query);
    res.json({ data: shiftTypes });
  } catch (err) {
    next(err);
  }
});

// Create shift type
router.post("/", authorize("ADMIN"), validate(createShiftTypeSchema), async (req, res, next) => {
  try {
    const shiftType = await createShiftType(req.body, req.user?.userId);
    res.status(201).json({ data: shiftType });
  } catch (err) {
    next(err);
  }
});

// Get single shift type
router.get("/:id", async (req, res, next) => {
  try {
    const shiftType = await getShiftTypeById(req.params.id);
    res.json({ data: shiftType });
  } catch (err) {
    next(err);
  }
});

// Update shift type
router.put("/:id", authorize("ADMIN"), validate(updateShiftTypeSchema), async (req, res, next) => {
  try {
    const shiftType = await updateShiftType(req.params.id as string, req.body, req.user?.userId);
    res.json({ data: shiftType });
  } catch (err) {
    next(err);
  }
});

// Delete shift type
router.delete("/:id", authorize("ADMIN"), async (req, res, next) => {
  try {
    await deleteShiftType(req.params.id as string, req.user?.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
