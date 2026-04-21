import PDFDocument from "pdfkit";
import type {
  AttendanceReport,
  HeadcountReport,
  PayrollReport,
} from "./report.service.js";

const PHP = (n: number): string =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

type Doc = InstanceType<typeof PDFDocument>;

function bufferize(doc: Doc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function drawTitle(doc: Doc, title: string, subtitle: string) {
  const leftX = doc.page.margins.left;
  doc.fontSize(16).font("Helvetica-Bold").fillColor("black");
  doc.text(title, leftX, doc.y);
  doc.fontSize(10).font("Helvetica").fillColor("#555");
  doc.text(subtitle, leftX, doc.y + 2);
  doc.fillColor("black").moveDown(0.8);
}

function drawSectionHeader(doc: Doc, label: string) {
  doc.moveDown(0.6);
  doc.fontSize(12).font("Helvetica-Bold").fillColor("black");
  doc.text(label, doc.page.margins.left, doc.y);
  doc.moveDown(0.3);
}

/**
 * Draw a simple text-grid table. Widths must sum to the content area width.
 */
function drawTable(
  doc: Doc,
  headers: string[],
  widths: number[],
  rows: (string | number)[][],
  align: Array<"left" | "right"> = []
) {
  const leftX = doc.page.margins.left;
  const rowH = 16;
  const headerH = 18;

  // Header
  let x = leftX;
  doc.fontSize(9).font("Helvetica-Bold").fillColor("black");
  headers.forEach((h, i) => {
    doc.text(h, x + 2, doc.y + 4, {
      width: widths[i] - 4,
      align: align[i] ?? "left",
      lineBreak: false,
    });
    x += widths[i];
  });
  const headerY = doc.y;
  doc
    .moveTo(leftX, headerY + headerH - 2)
    .lineTo(leftX + widths.reduce((a, b) => a + b, 0), headerY + headerH - 2)
    .strokeColor("#888")
    .stroke();
  doc.y = headerY + headerH;

  // Rows
  doc.font("Helvetica").fontSize(9).fillColor("#111");
  for (const row of rows) {
    // page break
    if (doc.y + rowH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
    x = leftX;
    const rowY = doc.y;
    row.forEach((cell, i) => {
      doc.text(String(cell), x + 2, rowY + 3, {
        width: widths[i] - 4,
        align: align[i] ?? "left",
        lineBreak: false,
      });
      x += widths[i];
    });
    doc.y = rowY + rowH;
    doc
      .moveTo(leftX, doc.y - 1)
      .lineTo(leftX + widths.reduce((a, b) => a + b, 0), doc.y - 1)
      .strokeColor("#eee")
      .stroke();
  }
  doc.fillColor("black");
  doc.moveDown(0.4);
}

function contentWidth(doc: Doc): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

export async function attendanceToPdf(r: AttendanceReport): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  drawTitle(
    doc,
    "KAOS Cafe — Attendance Report",
    `Period: ${r.range.from} to ${r.range.to}`
  );

  // Totals block
  drawSectionHeader(doc, "Totals");
  const totals = r.totals;
  drawTable(
    doc,
    ["Metric", "Value"],
    [contentWidth(doc) * 0.6, contentWidth(doc) * 0.4],
    [
      ["Total records", totals.totalRecords],
      ["Present", totals.present],
      ["Late", totals.late],
      ["Absent", totals.absent],
      ["Half day", totals.halfDay],
      ["Total hours worked", totals.totalHoursWorked],
      ["Total overtime hours", totals.totalOvertimeHours],
      ["Total late minutes", totals.totalLateMinutes],
    ],
    ["left", "right"]
  );

  drawSectionHeader(doc, "By Branch");
  const w = contentWidth(doc);
  drawTable(
    doc,
    ["Branch", "Total", "Present", "Late", "Absent", "Late Mins"],
    [w * 0.3, w * 0.12, w * 0.14, w * 0.14, w * 0.14, w * 0.16],
    r.byBranch.map((b) => [
      b.branchName,
      b.totalRecords,
      b.present,
      b.late,
      b.absent,
      b.totalLateMinutes,
    ]),
    ["left", "right", "right", "right", "right", "right"]
  );

  if (r.byEmployee.length > 0) {
    drawSectionHeader(doc, "By Employee");
    drawTable(
      doc,
      ["Employee", "Branch", "Present", "Late", "Absent", "Late Mins"],
      [w * 0.28, w * 0.22, w * 0.1, w * 0.1, w * 0.1, w * 0.2],
      r.byEmployee.map((e) => [
        `${e.employeeCode} · ${e.employeeName}`,
        e.branchName,
        e.present,
        e.late,
        e.absent,
        e.totalLateMinutes,
      ]),
      ["left", "left", "right", "right", "right", "right"]
    );
  }

  return bufferize(doc);
}

export async function payrollToPdf(r: PayrollReport): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  drawTitle(
    doc,
    "KAOS Cafe — Payroll Report",
    `Period: ${r.range.from} to ${r.range.to}`
  );

  drawSectionHeader(doc, "Totals");
  drawTable(
    doc,
    ["Metric", "Value"],
    [contentWidth(doc) * 0.6, contentWidth(doc) * 0.4],
    [
      ["Run count", r.totals.runCount],
      ["Payslip count", r.totals.payslipCount],
      ["Total gross", PHP(r.totals.totalGross)],
      ["Total deductions", PHP(r.totals.totalDeductions)],
      ["Total net", PHP(r.totals.totalNet)],
    ],
    ["left", "right"]
  );

  const w = contentWidth(doc);
  drawSectionHeader(doc, "By Branch");
  drawTable(
    doc,
    ["Branch", "Runs", "Payslips", "Gross", "Deductions", "Net"],
    [w * 0.25, w * 0.1, w * 0.13, w * 0.17, w * 0.17, w * 0.18],
    r.byBranch.map((b) => [
      b.branchName,
      b.runCount,
      b.payslipCount,
      PHP(b.totalGross),
      PHP(b.totalDeductions),
      PHP(b.totalNet),
    ]),
    ["left", "right", "right", "right", "right", "right"]
  );

  if (r.runs.length > 0) {
    drawSectionHeader(doc, "Runs");
    drawTable(
      doc,
      ["Period", "Branch", "Status", "Payslips", "Gross", "Net"],
      [w * 0.2, w * 0.22, w * 0.12, w * 0.11, w * 0.17, w * 0.18],
      r.runs.map((run) => [
        `${run.periodStart} — ${run.periodEnd}`,
        run.branchName,
        run.status,
        run.payslipCount,
        PHP(run.totalGross),
        PHP(run.totalNet),
      ]),
      ["left", "left", "left", "right", "right", "right"]
    );
  }

  return bufferize(doc);
}

export async function headcountToPdf(r: HeadcountReport): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  drawTitle(doc, "KAOS Cafe — Headcount Report", "Current state");

  drawSectionHeader(doc, "Totals");
  drawTable(
    doc,
    ["Metric", "Value"],
    [contentWidth(doc) * 0.6, contentWidth(doc) * 0.4],
    [
      ["Active", r.totals.active],
      ["Inactive", r.totals.inactive],
      ["On leave", r.totals.onLeave],
      ["Terminated", r.totals.terminated],
      ["Total", r.totals.total],
    ],
    ["left", "right"]
  );

  const w = contentWidth(doc);
  drawSectionHeader(doc, "By Branch");
  drawTable(
    doc,
    ["Branch", "Active", "Inactive", "On Leave", "Terminated", "Total"],
    [w * 0.28, w * 0.12, w * 0.14, w * 0.14, w * 0.16, w * 0.16],
    r.byBranch.map((b) => [
      b.branchName,
      b.active,
      b.inactive,
      b.onLeave,
      b.terminated,
      b.total,
    ]),
    ["left", "right", "right", "right", "right", "right"]
  );

  if (r.byPosition.length > 0) {
    drawSectionHeader(doc, "By Position");
    drawTable(
      doc,
      ["Position", "Count"],
      [w * 0.7, w * 0.3],
      r.byPosition.map((p) => [p.position, p.count]),
      ["left", "right"]
    );
  }

  return bufferize(doc);
}
