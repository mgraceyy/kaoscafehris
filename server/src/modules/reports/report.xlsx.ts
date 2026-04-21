import ExcelJS from "exceljs";
import type {
  AttendanceReport,
  HeadcountReport,
  PayrollReport,
} from "./report.service.js";

const PHP_FMT = '_-"₱"* #,##0.00_-;-"₱"* #,##0.00_-;_-"₱"* "-"??_-;_-@_-';

function writeHeader(
  ws: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  span: string
) {
  ws.mergeCells(`A1:${span}1`);
  ws.getCell("A1").value = title;
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells(`A2:${span}2`);
  ws.getCell("A2").value = subtitle;
  ws.getCell("A2").alignment = { horizontal: "center" };
  ws.getCell("A2").font = { color: { argb: "FF555555" } };
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFEFEF" },
    };
    cell.border = { bottom: { style: "thin", color: { argb: "FFCCCCCC" } } };
  });
}

export async function attendanceToXlsx(r: AttendanceReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "KAOS Cafe HRIS";
  wb.created = new Date();

  // Summary sheet
  const s = wb.addWorksheet("Summary");
  writeHeader(
    s,
    "KAOS Cafe — Attendance Report",
    `Period: ${r.range.from} to ${r.range.to}`,
    "D"
  );
  s.addRow([]);
  s.addRow(["Metric", "Value"]).eachCell((c) => (c.font = { bold: true }));
  s.addRow(["Total records", r.totals.totalRecords]);
  s.addRow(["Present", r.totals.present]);
  s.addRow(["Late", r.totals.late]);
  s.addRow(["Absent", r.totals.absent]);
  s.addRow(["Half day", r.totals.halfDay]);
  s.addRow(["Total hours worked", r.totals.totalHoursWorked]);
  s.addRow(["Total overtime hours", r.totals.totalOvertimeHours]);
  s.addRow(["Total late minutes", r.totals.totalLateMinutes]);
  s.columns = [{ width: 26 }, { width: 16 }];

  // Per branch
  const b = wb.addWorksheet("By Branch");
  const bh = b.addRow([
    "Branch",
    "Total",
    "Present",
    "Late",
    "Absent",
    "Half Day",
    "Hours Worked",
    "OT Hours",
    "Late Mins",
  ]);
  styleHeaderRow(bh);
  for (const row of r.byBranch) {
    b.addRow([
      row.branchName,
      row.totalRecords,
      row.present,
      row.late,
      row.absent,
      row.halfDay,
      row.totalHoursWorked,
      row.totalOvertimeHours,
      row.totalLateMinutes,
    ]);
  }
  b.columns = [
    { width: 24 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
  ];

  // Per employee
  const e = wb.addWorksheet("By Employee");
  const eh = e.addRow([
    "Employee ID",
    "Name",
    "Branch",
    "Present",
    "Late",
    "Absent",
    "Half Day",
    "Hours Worked",
    "OT Hours",
    "Late Mins",
  ]);
  styleHeaderRow(eh);
  for (const row of r.byEmployee) {
    e.addRow([
      row.employeeCode,
      row.employeeName,
      row.branchName,
      row.present,
      row.late,
      row.absent,
      row.halfDay,
      row.totalHoursWorked,
      row.totalOvertimeHours,
      row.totalLateMinutes,
    ]);
  }
  e.columns = [
    { width: 14 },
    { width: 26 },
    { width: 20 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
  ];

  const raw = await wb.xlsx.writeBuffer();
  return Buffer.from(raw as ArrayBuffer);
}

export async function payrollToXlsx(r: PayrollReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "KAOS Cafe HRIS";
  wb.created = new Date();

  // Summary
  const s = wb.addWorksheet("Summary");
  writeHeader(
    s,
    "KAOS Cafe — Payroll Report",
    `Period: ${r.range.from} to ${r.range.to}`,
    "D"
  );
  s.addRow([]);
  s.addRow(["Metric", "Value"]).eachCell((c) => (c.font = { bold: true }));
  s.addRow(["Run count", r.totals.runCount]);
  s.addRow(["Payslip count", r.totals.payslipCount]);
  const gross = s.addRow(["Total gross", r.totals.totalGross]);
  const ded = s.addRow(["Total deductions", r.totals.totalDeductions]);
  const net = s.addRow(["Total net", r.totals.totalNet]);
  gross.getCell(2).numFmt = PHP_FMT;
  ded.getCell(2).numFmt = PHP_FMT;
  net.getCell(2).numFmt = PHP_FMT;
  s.columns = [{ width: 24 }, { width: 20 }];

  // By branch
  const b = wb.addWorksheet("By Branch");
  const bh = b.addRow([
    "Branch",
    "Runs",
    "Payslips",
    "Gross",
    "Deductions",
    "Net",
  ]);
  styleHeaderRow(bh);
  for (const row of r.byBranch) {
    const added = b.addRow([
      row.branchName,
      row.runCount,
      row.payslipCount,
      row.totalGross,
      row.totalDeductions,
      row.totalNet,
    ]);
    added.getCell(4).numFmt = PHP_FMT;
    added.getCell(5).numFmt = PHP_FMT;
    added.getCell(6).numFmt = PHP_FMT;
  }
  b.columns = [
    { width: 24 },
    { width: 10 },
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ];

  // Runs detail
  const runs = wb.addWorksheet("Runs");
  const rh = runs.addRow([
    "Period Start",
    "Period End",
    "Branch",
    "Status",
    "Payslips",
    "Gross",
    "Deductions",
    "Net",
  ]);
  styleHeaderRow(rh);
  for (const row of r.runs) {
    const added = runs.addRow([
      row.periodStart,
      row.periodEnd,
      row.branchName,
      row.status,
      row.payslipCount,
      row.totalGross,
      row.totalDeductions,
      row.totalNet,
    ]);
    added.getCell(6).numFmt = PHP_FMT;
    added.getCell(7).numFmt = PHP_FMT;
    added.getCell(8).numFmt = PHP_FMT;
  }
  runs.columns = [
    { width: 14 },
    { width: 14 },
    { width: 24 },
    { width: 12 },
    { width: 10 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ];

  const raw = await wb.xlsx.writeBuffer();
  return Buffer.from(raw as ArrayBuffer);
}

export async function headcountToXlsx(r: HeadcountReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "KAOS Cafe HRIS";
  wb.created = new Date();

  const s = wb.addWorksheet("Summary");
  writeHeader(s, "KAOS Cafe — Headcount Report", "Current state", "B");
  s.addRow([]);
  s.addRow(["Metric", "Value"]).eachCell((c) => (c.font = { bold: true }));
  s.addRow(["Active", r.totals.active]);
  s.addRow(["Inactive", r.totals.inactive]);
  s.addRow(["On leave", r.totals.onLeave]);
  s.addRow(["Terminated", r.totals.terminated]);
  s.addRow(["Total", r.totals.total]);
  s.columns = [{ width: 18 }, { width: 12 }];

  const b = wb.addWorksheet("By Branch");
  const bh = b.addRow([
    "Branch",
    "Active",
    "Inactive",
    "On Leave",
    "Terminated",
    "Total",
  ]);
  styleHeaderRow(bh);
  for (const row of r.byBranch) {
    b.addRow([
      row.branchName,
      row.active,
      row.inactive,
      row.onLeave,
      row.terminated,
      row.total,
    ]);
  }
  b.columns = [
    { width: 24 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 12 },
    { width: 10 },
  ];

  const p = wb.addWorksheet("By Position");
  const ph = p.addRow(["Position", "Count"]);
  styleHeaderRow(ph);
  for (const row of r.byPosition) {
    p.addRow([row.position, row.count]);
  }
  p.columns = [{ width: 28 }, { width: 10 }];

  const raw = await wb.xlsx.writeBuffer();
  return Buffer.from(raw as ArrayBuffer);
}
