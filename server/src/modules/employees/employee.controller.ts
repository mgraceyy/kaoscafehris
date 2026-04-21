import type { Request, Response, NextFunction } from "express";
import ExcelJS from "exceljs";
import { listEmployeeQuerySchema } from "./employee.schema.js";
import * as employeeService from "./employee.service.js";
import prisma from "../../config/db.js";

type IdParams = { id: string };

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listEmployeeQuerySchema.parse(req.query);
    const data = await employeeService.listEmployees(query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getById(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await employeeService.getEmployeeById(req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await employeeService.createEmployee(req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function update(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await employeeService.updateEmployee(req.params.id, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function deactivate(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await employeeService.deactivateEmployee(req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function importCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    let csvContent: string;

    const isXlsx =
      req.file.originalname.endsWith(".xlsx") ||
      req.file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (isXlsx) {
      // Convert the first visible sheet to CSV so the existing import logic stays unchanged.
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(req.file.buffer);
      const ws = wb.worksheets.find((s) => s.state !== "veryHidden" && s.state !== "hidden");
      if (!ws) throw new Error("No readable sheet found in the uploaded file");

      const rows: string[] = [];
      ws.eachRow((row) => {
        const cells = (row.values as (ExcelJS.CellValue | undefined)[])
          .slice(1) // exceljs uses 1-based index; index 0 is always undefined
          .map((v) => {
            const str = v == null ? "" : String(v);
            return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
          });
        rows.push(cells.join(","));
      });
      csvContent = rows.join("\n");
    } else {
      csvContent = req.file.buffer.toString("utf-8");
    }

    const data = await employeeService.importEmployees(csvContent);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function csvTemplate(_req: Request, res: Response, next: NextFunction) {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: { name: true },
      orderBy: { name: "asc" },
    });
    const branchNames = branches.map((b) => b.name);

    const wb = new ExcelJS.Workbook();

    // ── Hidden sheet that holds the branch list for the dropdown ──────────
    const listSheet = wb.addWorksheet("_branches", { state: "veryHidden" });
    branchNames.forEach((name, i) => {
      listSheet.getCell(`A${i + 1}`).value = name;
    });

    // ── Main data entry sheet ─────────────────────────────────────────────
    const ws = wb.addWorksheet("Employees");

    const COLUMNS = [
      { header: "employeeId",       key: "employeeId",       width: 18 },
      { header: "firstName",        key: "firstName",        width: 16 },
      { header: "lastName",         key: "lastName",         width: 16 },
      { header: "email",            key: "email",            width: 28 },
      { header: "password",         key: "password",         width: 18 },
      { header: "role",             key: "role",             width: 12 },
      { header: "branchId",         key: "branchId",         width: 24 },
      { header: "position",         key: "position",         width: 18 },
      { header: "department",       key: "department",       width: 18 },
      { header: "dateHired",        key: "dateHired",        width: 14 },
      { header: "basicSalary",      key: "basicSalary",      width: 14 },
      { header: "employmentStatus", key: "employmentStatus", width: 18 },
    ];
    ws.columns = COLUMNS;

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8C1515" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    headerRow.height = 20;

    // Example row — styled gray/italic so users know to delete it before importing
    const exampleRow = ws.addRow({
      employeeId: "EXAMPLE-001",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "ChangeMe@1234",
      role: "EMPLOYEE",
      branchId: branchNames[0] ?? "",
      position: "Barista",
      department: "Operations",
      dateHired: "2024-01-15",
      basicSalary: 18000,
      employmentStatus: "ACTIVE",
    });
    exampleRow.eachCell((cell) => {
      cell.font = { italic: true, color: { argb: "FF999999" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };
    });
    // Note in the last column reminding users to delete this row
    const noteCell = exampleRow.getCell(COLUMNS.length + 1);
    noteCell.value = "⚠ Delete this example row before importing";
    noteCell.font = { italic: true, color: { argb: "FFCC0000" } };

    const MAX_ROWS = 500;
    const branchCol = 7; // column G

    if (branchNames.length > 0) {
      const branchFormula = `_branches!$A$1:$A$${branchNames.length}`;
      for (let r = 2; r <= MAX_ROWS; r++) {
        ws.getCell(r, branchCol).dataValidation = {
          type: "list",
          formulae: [branchFormula],
          showErrorMessage: true,
          errorTitle: "Invalid branch",
          error: "Please select a branch from the dropdown list.",
        };
      }
    }

    // role dropdown
    for (let r = 2; r <= MAX_ROWS; r++) {
      ws.getCell(r, 6).dataValidation = {
        type: "list",
        formulae: ['"EMPLOYEE,MANAGER,ADMIN"'],
        showErrorMessage: true,
        errorTitle: "Invalid role",
        error: "Choose EMPLOYEE, MANAGER, or ADMIN.",
      };
      ws.getCell(r, 12).dataValidation = {
        type: "list",
        formulae: ['"ACTIVE,INACTIVE,ON_LEAVE"'],
        showErrorMessage: true,
        errorTitle: "Invalid status",
        error: "Choose ACTIVE, INACTIVE, or ON_LEAVE.",
      };
    }

    const buf = await wb.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="employee_import_template.xlsx"');
    res.setHeader("Content-Length", buf.byteLength.toString());
    res.end(buf);
  } catch (err) {
    next(err);
  }
}
