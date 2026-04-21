import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  clockInSchema,
  clockOutSchema,
  manualAdjustSchema,
  syncBatchSchema,
} from "./attendance.schema.js";
import * as attendanceController from "./attendance.controller.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const selfieDir = path.join(__dirname, "..", "..", "..", "uploads", "selfies");
fs.mkdirSync(selfieDir, { recursive: true });

const selfieUpload = multer({
  storage: multer.diskStorage({
    destination: selfieDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const router = Router();

// All attendance endpoints require an authenticated user. The kiosk will
// authenticate via a device-bound service token in a future iteration — for
// now, any authenticated user can record attendance, gated by role at the UI.
router.use(authenticate);

router.post(
  "/upload-selfie",
  selfieUpload.single("selfie"),
  attendanceController.uploadSelfie
);
router.post("/clock-in", validate(clockInSchema), attendanceController.clockIn);
router.post("/:id/clock-out", validate(clockOutSchema), attendanceController.clockOut);
router.post("/sync", validate(syncBatchSchema), attendanceController.sync);

router.get("/", authorize("ADMIN", "MANAGER"), attendanceController.list);
router.get("/:id", authorize("ADMIN", "MANAGER"), attendanceController.getById);
router.put(
  "/:id",
  authorize("ADMIN"),
  validate(manualAdjustSchema),
  attendanceController.adjust
);

export default router;
