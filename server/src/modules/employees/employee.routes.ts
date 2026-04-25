import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createEmployeeSchema, updateEmployeeSchema } from "./employee.schema.js";
import * as employeeController from "./employee.controller.js";

const router = Router();
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } });

router.use(authenticate, authorize("ADMIN"));

router.get("/", employeeController.list);
router.get("/import/template", employeeController.csvTemplate);
router.get("/:id", employeeController.getById);
router.post("/", validate(createEmployeeSchema), employeeController.create);
router.post("/import/preview", csvUpload.single("file"), employeeController.previewImportCsv);
router.post("/import", csvUpload.single("file"), employeeController.importCsv);
router.put("/:id", validate(updateEmployeeSchema), employeeController.update);
router.delete("/:id", employeeController.deactivate);

export default router;
