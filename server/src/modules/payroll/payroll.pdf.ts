import PDFDocument from "pdfkit";
import type { Prisma } from "@prisma/client";

type PayslipWithRelations = Prisma.PayslipGetPayload<{
  include: {
    employee: {
      select: {
        id: true;
        employeeId: true;
        firstName: true;
        lastName: true;
        position: true;
        basicSalary: true;
        sssNumber: true;
        philhealthNumber: true;
        pagibigNumber: true;
        tinNumber: true;
        branch: { select: { id: true; name: true; city: true } };
      };
    };
    payrollRun: {
      select: {
        id: true;
        periodStart: true;
        periodEnd: true;
        status: true;
        branch: { select: { id: true; name: true; city: true } };
      };
    };
    earnings: true;
    deductions: true;
  };
}>;

const BRAND = "#8C1515";
const GOV_TYPES = new Set(["SSS", "PHILHEALTH", "PAGIBIG", "BIR_TAX"]);

// Helvetica (WinAnsi) cannot render the peso glyph (U+20B1) — use "P" prefix.
const PHP = (n: Prisma.Decimal | number | string): string => {
  const v = typeof n === "number" ? n : Number(n);
  const num = Number.isFinite(v) ? v : 0;
  return (
    "P" +
    new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  );
};

function fmtPeriod(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  };
  const s = start.toLocaleDateString("en-US", opts);
  const e = end.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  // en-dash U+2013 is in WinAnsi; safe for Helvetica
  return `Payslip for ${s} – ${e}`;
}

export function renderPayslip(
  doc: InstanceType<typeof PDFDocument>,
  payslip: PayslipWithRelations
): void {
  const { employee, payrollRun, earnings, deductions } = payslip;
  const margin = doc.page.margins.left;
  const pageW = doc.page.width - margin * 2;
  const rightX = margin + pageW;

  // ── Header bar ─────────────────────────────────────────────────────────────
  const headerH = 60;
  doc.rect(0, 0, doc.page.width, headerH).fill(BRAND);
  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor("white")
    .text("KAOS HRIS", margin, 13);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("white")
    .text(fmtPeriod(payrollRun.periodStart, payrollRun.periodEnd), margin, 33);

  let y = headerH + 18;
  doc.fillColor("black");

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Small uppercase section heading. Advances y via doc.y. */
  const sectionLabel = (title: string) => {
    y += 4;
    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .fillColor("#9CA3AF")
      .text(title.toUpperCase(), margin, y, { characterSpacing: 0.8 });
    y = doc.y + 5;
    doc.fillColor("black");
  };

  const divider = (color = "#E5E7EB") => {
    doc
      .moveTo(margin, y)
      .lineTo(rightX, y)
      .strokeColor(color)
      .lineWidth(0.5)
      .stroke();
    y += 8;
  };

  /**
   * One label + right-aligned amount row.
   *
   * Key: render label WITHOUT lineBreak:false so doc.y advances correctly;
   * capture nextY after label; render amount at the ORIGINAL y so it sits on
   * the same baseline; advance y to nextY + gap.
   */
  const rowLine = (
    label: string,
    amount: string,
    opts?: { bold?: boolean; red?: boolean }
  ) => {
    const bold = opts?.bold ?? false;
    const red = opts?.red ?? false;
    const rowY = y;

    // Measure amount width while font is set correctly
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.5);
    const amtW = doc.widthOfString(amount);

    // Render label — this call advances doc.y
    doc
      .fillColor(bold ? "#111827" : "#6B7280")
      .text(label, margin, rowY, { width: pageW * 0.65 });
    const nextY = doc.y;

    // Render amount at same row baseline — lineBreak:false prevents wrapping
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(9.5)
      .fillColor(red ? "#DC2626" : "#111827")
      .text(amount, rightX - amtW, rowY, { lineBreak: false });

    doc.fillColor("black");
    y = nextY + 3;
  };

  // ── Employee Information ────────────────────────────────────────────────────
  sectionLabel("Employee Information");

  const halfW = pageW / 2;
  const rx = margin + halfW;
  const iY = y;

  // Left column — fixed offsets so both columns share the same y grid
  doc.font("Helvetica").fontSize(7).fillColor("#9CA3AF").text("Name", margin, iY);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111827")
    .text(`${employee.firstName} ${employee.lastName}`, margin, iY + 10, {
      width: halfW - 8,
    });
  doc.font("Helvetica").fontSize(7).fillColor("#9CA3AF").text("Position", margin, iY + 26);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111827")
    .text(employee.position, margin, iY + 36, { width: halfW - 8 });

  // Right column
  doc.font("Helvetica").fontSize(7).fillColor("#9CA3AF").text("Employee ID", rx, iY);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111827")
    .text(employee.employeeId, rx, iY + 10, { width: halfW });
  doc.font("Helvetica").fontSize(7).fillColor("#9CA3AF").text("Branch", rx, iY + 26);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111827")
    .text(payrollRun.branch.name, rx, iY + 36, { width: halfW });

  doc.fillColor("black");
  y = iY + 54;
  divider();

  // ── Earnings ───────────────────────────────────────────────────────────────
  sectionLabel("Earnings");
  rowLine("Base Salary (bi-monthly)", PHP(payslip.basicPay));
  for (const e of earnings) rowLine(e.label, PHP(e.amount));
  divider("#D1D5DB");
  rowLine("Gross Pay", PHP(payslip.grossPay), { bold: true });
  y += 6;

  // ── Deductions ─────────────────────────────────────────────────────────────
  const regularDeductions = deductions.filter((d) => !GOV_TYPES.has(d.type));
  if (regularDeductions.length > 0) {
    sectionLabel("Deductions");
    for (const d of regularDeductions) rowLine(d.label, PHP(d.amount));
    y += 4;
  }

  // ── Government Contributions ───────────────────────────────────────────────
  const govDeductions = deductions.filter((d) => GOV_TYPES.has(d.type));
  if (govDeductions.length > 0) {
    sectionLabel("Government Contributions");
    for (const d of govDeductions) rowLine(d.label, PHP(d.amount));
    y += 4;
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  divider();
  sectionLabel("Summary");
  rowLine("Gross Pay", PHP(payslip.grossPay));
  rowLine("Total Deductions", `- ${PHP(payslip.totalDeductions)}`, { red: true });
  y += 6;

  // Net Pay box
  const netBoxH = 40;
  const boxY = y;
  doc.roundedRect(margin, boxY, pageW, netBoxH, 4).fill("#FDF5F5");

  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor("#111827")
    .text("Net Pay", margin + 14, boxY + 12);

  const netStr = PHP(payslip.netPay);
  doc.font("Helvetica-Bold").fontSize(15);
  const netW = doc.widthOfString(netStr);
  doc
    .fillColor(BRAND)
    .text(netStr, rightX - netW - 14, boxY + 10);

  doc.fillColor("black");
  y = boxY + netBoxH + 16;

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor("#9CA3AF")
    .text(
      `Status: ${payslip.status}  ·  Generated: ${new Date().toLocaleString("en-PH")}`,
      margin,
      y
    );
  doc.fillColor("black");
}

export async function payslipToBuffer(
  payslip: PayslipWithRelations
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    renderPayslip(doc, payslip);
    doc.end();
  });
}

export async function runToBuffer(
  payslips: PayslipWithRelations[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    payslips.forEach((p, idx) => {
      if (idx > 0) doc.addPage();
      renderPayslip(doc, p);
    });
    doc.end();
  });
}
