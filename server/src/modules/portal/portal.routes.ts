import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "./portal.schema.js";
import * as portalController from "./portal.controller.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const photosDir = path.join(__dirname, "..", "..", "..", "uploads", "photos");
fs.mkdirSync(photosDir, { recursive: true });

const photoUpload = multer({
  storage: multer.diskStorage({
    destination: photosDir,
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

router.use(authenticate);

router.get("/profile", portalController.getProfile);
router.put("/profile", validate(updateProfileSchema), portalController.updateProfile);
router.post("/profile/photo", photoUpload.single("photo"), portalController.uploadPhoto);
router.put("/password", validate(changePasswordSchema), portalController.changePassword);
router.get("/schedule", portalController.getSchedule);
router.get("/attendance", portalController.getAttendance);

export default router;
