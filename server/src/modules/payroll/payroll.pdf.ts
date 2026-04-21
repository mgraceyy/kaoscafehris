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
        department: true;
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

const PHP = (n: Prisma.Decimal | number | string): string => {
  const v = typeof n === "number" ? n : Number(n);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(v) ? v : 0);
};

const fmtDate = (d: Date | string): string =>
  typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);

/**
 * Render a single payslip as PDF. Pass the doc to render in-place (multi-page
 * bulk export); pass nothing to get a fresh one-page Buffer.
 */
export function renderPayslip(
  doc: InstanceType<typeof PDFDocument>,
  payslip: PayslipWithRelations
): void {
  const { employee, payrollRun, earnings, deductions } = payslip;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const leftX = doc.page.margins.left;

  // --- Header
  doc.fontSize(16).font("Helvetica-Bold").text("KAOS Cafe — Payslip", leftX, doc.y);
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#555")
    .text(
      `${payrollRun.branch.name} · ${payrollRun.branch.city}`,
      leftX,
      doc.y + 2
    );
  doc
    .fontSize(9)
    .fillColor("#555")
    .text(
      `Period: ${fmtDate(payrollRun.periodStart)} to ${fmtDate(payrollRun.periodEnd)}`,
      leftX,
      doc.y + 2
    );
  doc.fillColor("black");
  doc.moveDown(0.8);

  // --- Employee block
  doc
    .moveTo(leftX, doc.y)
    .lineTo(leftX + pageWidth, doc.y)
    .strokeColor("#ddd")
    .stroke();
  doc.moveDown(0.4);

  const colW = pageWidth / 2;
  const infoStartY = doc.y;
  doc.fontSize(10).font("Helvetica-Bold").fillColor("black");
  doc.text(`${employee.firstName} ${employee.lastName}`, leftX, doc.y);
  doc.font("Helvetica").fontSize(9).fillColor("#333");
  doc.text(`${employee.employeeId} · ${employee.position}`, leftX, doc.y);
  if (employee.department) doc.text(employee.department, leftX, doc.y);

  // Right column: government IDs
  const rightX = leftX + colW;
  doc.fontSize(9).fillColor("#333");
  let rightY = infoStartY;
  const gov = [
    ["SSS", employee.sssNumber],
    ["PhilHealth", employee.philhealthNumber],
    ["Pag-IBIG", employee.pagibigNumber],
    ["TIN", employee.tinNumber],
  ];
  for (const [label, value] of gov) {
    if (value) {
      doc.text(`${label}: ${value}`, rightX, rightY, { width: colW });
      rightY = doc.y;
    }
  }
  doc.y = Math.max(doc.y, rightY);
  doc.moveDown(0.6);

  // --- Earnings + Deductions (two columns)
  const colGap = 12;
  const halfW = (pageWidth - colGap) / 2;
  const tableStartY = doc.y;

  const drawTable = (
    title: string,
    rows: Array<{ label: string; amount: Prisma.Decimal | number | string }>,
    x: number,
    width: number
  ): number => {
    doc.font("Helvetica-Bold").fontSize(10).fillColor("black");
    doc.text(title, x, tableStartY);
    let y = doc.y + 2;
    doc.moveTo(x, y).lineTo(x + width, y).strokeColor("#ccc").stroke();
    y += 4;
    doc.font("Helvetica").fontSize(9);
    for (const r of rows) {
      const amountText = PHP(r.amount);
      const amountWidth = doc.widthOfString(amountText);
      doc.fillColor("#333").text(r.label, x, y, { width: width - amountWidth - 8 });
      const rowY = y;
      doc.fillColor("black").text(amountText, x + width - amountWidth, rowY);
      y = doc.y + 2;
    }
    if (rows.length === 0) {
      doc.fillColor("#777").text("—", x, y);
      y = doc.y + 2;
    }
    return y;
  };

  const earningRows = [
    { label: "Basic pay", amount: payslip.basicPay },
    ...earnings.map((e) => ({ label: e.label, amount: e.amount })),
  ];

  const yAfterLeft = drawTable("Earnings", earningRows, leftX, halfW);
  const yAfterRight = drawTable(
    "Deductions",
    deductions.map((d) => ({ label: d.label, amount: d.amount })),
    leftX + halfW + colGap,
    halfW
  );

  doc.y = Math.max(yAfterLeft, yAfterRight) + 6;

  // --- Totals
  doc.moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).strokeColor("#ccc").stroke();
  doc.moveDown(0.4);

  const writeTotal = (label: string, value: string, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 10);
    const valueWidth = doc.widthOfString(value);
    const y = doc.y;
    doc.text(label, leftX, y);
    doc.text(value, leftX + pageWidth - valueWidth, y);
    doc.moveDown(0.2);
  };

  writeTotal("Gross pay", PHP(payslip.grossPay));
  writeTotal("Total deductions", `- ${PHP(payslip.totalDeductions)}`);
  doc.moveDown(0.1);
  writeTotal("Net pay", PHP(payslip.netPay), true);

  // --- Footer
  doc.moveDown(1.2);
  doc
    .fontSize(8)
    .fillColor("#888")
    .text(
      `Status: ${payslip.status} · Payroll run: ${payrollRun.status} · Generated: ${new Date().toLocaleString("en-PH")}`,
      leftX,
      doc.y
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
