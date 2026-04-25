import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";

type RunExport = Prisma.PayrollRunGetPayload<{
  include: {
    branch: true;
    payslips: {
      include: {
        employee: {
          select: {
            id: true;
            employeeId: true;
            firstName: true;
            lastName: true;
            position: true;
            sssNumber: true;
            philhealthNumber: true;
            pagibigNumber: true;
            tinNumber: true;
          };
        };
        earnings: true;
        deductions: true;
      };
    };
  };
}>;

const num = (v: Prisma.Decimal | number | string | null | undefined): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export async function runToXlsx(run: RunExport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "KAOS Cafe HRIS";
  wb.created = new Date();

  // --- Sheet 1: Summary ---------------------------------------------------
  const summary = wb.addWorksheet("Summary");

  summary.mergeCells("A1:P1");
  summary.getCell("A1").value = `KAOS Cafe — Payroll Summary`;
  summary.getCell("A1").font = { bold: true, size: 14 };
  summary.getCell("A1").alignment = { horizontal: "center" };

  summary.mergeCells("A2:P2");
  summary.getCell("A2").value = `${run.branch.name} · ${run.branch.city}`;
  summary.getCell("A2").alignment = { horizontal: "center" };

  summary.mergeCells("A3:P3");
  summary.getCell("A3").value = `Period: ${run.periodStart
    .toISOString()
    .slice(0, 10)} to ${run.periodEnd.toISOString().slice(0, 10)} · Status: ${run.status}`;
  summary.getCell("A3").alignment = { horizontal: "center" };
  summary.getCell("A3").font = { color: { argb: "FF555555" } };

  summary.getRow(5).values = [
    "Employee ID",
    "Last Name",
    "First Name",
    "Position",
    "Basic Pay",
    "OT Pay",
    "Bonuses",
    "Allowances",
    "Holiday Pay",
    "Gross Pay",
    "SSS",
    "PhilHealth",
    "Pag-IBIG",
    "Withholding Tax",
    "Late",
    "Cash Advance",
    "Salary Loan",
    "Other Deductions",
    "Total Deductions",
    "Net Pay",
  ];
  summary.getRow(5).font = { bold: true };
  summary.getRow(5).alignment = { vertical: "middle" };
  summary.getRow(5).eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFEFEF" },
    };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    };
  });

  const currencyCols = [
    "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  ];

  run.payslips.forEach((p, idx) => {
    const r = summary.getRow(6 + idx);
    r.values = [
      p.employee.employeeId,
      p.employee.lastName,
      p.employee.firstName,
      p.employee.position,
      num(p.basicPay),
      num(p.overtimePay),
      num(p.bonuses),
      num(p.allowances),
      num(p.holidayPay),
      num(p.grossPay),
      num(p.sssContribution),
      num(p.philhealthContribution),
      num(p.pagibigContribution),
      num(p.withholdingTax),
      num(p.lateDeductions),
      num(p.cashAdvance),
      num(p.salaryLoan),
      num(p.otherDeductions),
      num(p.totalDeductions),
      num(p.netPay),
    ];
    currencyCols.forEach((c) => {
      r.getCell(c).numFmt = '_-"₱"* #,##0.00_-;-"₱"* #,##0.00_-;_-"₱"* "-"??_-;_-@_-';
    });
  });

  // Totals row
  if (run.payslips.length > 0) {
    const totalRow = summary.getRow(6 + run.payslips.length + 1);
    totalRow.getCell("A").value = "TOTAL";
    totalRow.font = { bold: true };
    const startRow = 6;
    const endRow = 6 + run.payslips.length - 1;
    currencyCols.forEach((c) => {
      totalRow.getCell(c).value = {
        formula: `SUM(${c}${startRow}:${c}${endRow})`,
      };
      totalRow.getCell(c).numFmt =
        '_-"₱"* #,##0.00_-;-"₱"* #,##0.00_-;_-"₱"* "-"??_-;_-@_-';
    });
    totalRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FF888888" } },
      };
    });
  }

  summary.columns = [
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 20 },
    { width: 16 },
    ...currencyCols.map(() => ({ width: 14 })),
  ];

  const raw = await wb.xlsx.writeBuffer();
  return Buffer.from(raw as ArrayBuffer);
}
