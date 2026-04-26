import type { Request, Response, NextFunction } from "express";
import ExcelJS from "exceljs";
import { listEmployeeQuerySchema } from "./employee.schema.js";
import * as employeeService from "./employee.service.js";
import * as edService from "./employee-deductions.service.js";
import * as eeService from "./employee-earnings.service.js";
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

// --- Employee Deductions ----------------------------------------------------

type EdParams = { id: string; edId: string };

export async function listDeductions(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const data = await edService.listEmployeeDeductions(req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function addDeduction(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const data = await edService.addEmployeeDeduction(req.params.id, req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateDeduction(req: Request<EdParams>, res: Response, next: NextFunction) {
  try {
    const data = await edService.updateEmployeeDeduction(req.params.id, req.params.edId, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function removeDeduction(req: Request<EdParams>, res: Response, next: NextFunction) {
  try {
    await edService.removeEmployeeDeduction(req.params.id, req.params.edId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// --- Employee Earnings ------------------------------------------------------

type EeParams = { id: string; eeId: string };

export async function listEarnings(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const data = await eeService.listEmployeeEarnings(req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function addEarning(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const data = await eeService.addEmployeeEarning(req.params.id, req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateEarning(req: Request<EeParams>, res: Response, next: NextFunction) {
  try {
    const data = await eeService.updateEmployeeEarning(req.params.id, req.params.eeId, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function removeEarning(req: Request<EeParams>, res: Response, next: NextFunction) {
  try {
    await eeService.removeEmployeeEarning(req.params.id, req.params.eeId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function xlsxToCsv(buffer: Buffer): Promise<string> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets.find((s) => s.state !== "veryHidden" && s.state !== "hidden");
  if (!ws) throw new Error("No readable sheet found in the uploaded file");

  const rows: string[] = [];
  ws.eachRow((row) => {
    const cells = (row.values as (ExcelJS.CellValue | undefined)[])
      .slice(1) // exceljs uses 1-based index; index 0 is always undefined
      .map((v) => {
        let str: string;
        if (v instanceof Date) {
          // Serialize date cells as YYYY-MM-DD to avoid timezone-dependent toString output
          const y = v.getUTCFullYear();
          const m = String(v.getUTCMonth() + 1).padStart(2, "0");
          const d = String(v.getUTCDate()).padStart(2, "0");
          str = `${y}-${m}-${d}`;
        } else {
          str = v == null ? "" : String(v);
        }
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      });
    rows.push(cells.join(","));
  });
  return rows.join("\n");
}

export async function importCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const isXlsx =
      req.file.originalname.endsWith(".xlsx") ||
      req.file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const csvContent = isXlsx
      ? await xlsxToCsv(req.file.buffer)
      : req.file.buffer.toString("utf-8");

    const data = await employeeService.importEmployees(csvContent);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function previewImportCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const isXlsx =
      req.file.originalname.endsWith(".xlsx") ||
      req.file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const csvContent = isXlsx
      ? await xlsxToCsv(req.file.buffer)
      : req.file.buffer.toString("utf-8");

    const data = await employeeService.previewImportEmployees(csvContent);
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
      // Required
      { header: "employeeId",       key: "employeeId",       width: 18 },
      { header: "firstName",        key: "firstName",        width: 16 },
      { header: "lastName",         key: "lastName",         width: 16 },
      { header: "middleName",       key: "middleName",       width: 16 },
      { header: "email",            key: "email",            width: 28 },
      { header: "password",         key: "password",         width: 18 },
      { header: "role",             key: "role",             width: 12 },
      { header: "branchId",         key: "branchId",         width: 24 },
      { header: "position",         key: "position",         width: 18 },
      { header: "dateHired",        key: "dateHired",        width: 14 },
      { header: "payType",          key: "payType",          width: 16 },
      { header: "rate",             key: "rate",             width: 16 },
      { header: "employmentStatus", key: "employmentStatus", width: 18 },
      // Contact
      { header: "phone",            key: "phone",            width: 16 },
      // Government IDs
      { header: "sssNumber",        key: "sssNumber",        width: 16 },
      { header: "philhealthNumber", key: "philhealthNumber", width: 18 },
      { header: "pagibigNumber",    key: "pagibigNumber",    width: 16 },
      { header: "tinNumber",        key: "tinNumber",        width: 16 },
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

    // Note on the rate column
    ws.getCell(1, 12).note = "Enter the monthly salary if payType is MONTHLY_FIXED, or the hourly rate if payType is HOURLY.";

    // Example row — styled gray/italic so users know to delete it before importing
    const exampleRow = ws.addRow({
      employeeId: "EXAMPLE-001",
      firstName: "Jane",
      lastName: "Doe",
      middleName: "Santos",
      email: "jane@example.com",
      password: "ChangeMe@1234",
      role: "EMPLOYEE",
      branchId: branchNames[0] ?? "",
      position: "Barista",
      dateHired: "2024-01-15",
      payType: "MONTHLY_FIXED",
      rate: 18000,
      employmentStatus: "ACTIVE",
      phone: "09171234567",
      sssNumber: "12-3456789-0",
      philhealthNumber: "12-345678901-2",
      pagibigNumber: "1234-5678-9012",
      tinNumber: "123-456-789-000",
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
    // Column positions (1-based):
    // 1=employeeId 2=firstName 3=lastName 4=middleName 5=email 6=password
    // 7=role 8=branchId 9=position 10=dateHired 11=payType 12=rate
    // 13=employmentStatus 14=phone 15=sssNumber ...
    const branchCol = 8;
    const roleCol = 7;
    const payTypeCol = 11;
    const statusCol = 13;

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

    for (let r = 2; r <= MAX_ROWS; r++) {
      ws.getCell(r, roleCol).dataValidation = {
        type: "list",
        formulae: ['"EMPLOYEE,MANAGER,ADMIN"'],
        showErrorMessage: true,
        errorTitle: "Invalid role",
        error: "Choose EMPLOYEE, MANAGER, or ADMIN.",
      };
      ws.getCell(r, payTypeCol).dataValidation = {
        type: "list",
        formulae: ['"MONTHLY_FIXED,HOURLY"'],
        showErrorMessage: true,
        errorTitle: "Invalid pay type",
        error: "Choose MONTHLY_FIXED or HOURLY.",
      };
      ws.getCell(r, statusCol).dataValidation = {
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
