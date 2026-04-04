import { Router } from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import employeeRoutes from "./modules/employees/employee.routes.js";
import branchRoutes from "./modules/branches/branch.routes.js";
import schedulingRoutes from "./modules/scheduling/scheduling.routes.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import leaveRoutes from "./modules/leave/leave.routes.js";
import payrollRoutes from "./modules/payroll/payroll.routes.js";
import reportRoutes from "./modules/reports/report.routes.js";
import portalRoutes from "./modules/portal/portal.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";
import auditLogRoutes from "./modules/audit-logs/audit-log.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/employees", employeeRoutes);
router.use("/branches", branchRoutes);
router.use("/scheduling", schedulingRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/leave", leaveRoutes);
router.use("/payroll", payrollRoutes);
router.use("/reports", reportRoutes);
router.use("/portal", portalRoutes);
router.use("/settings", settingsRoutes);
router.use("/audit-logs", auditLogRoutes);

export default router;
