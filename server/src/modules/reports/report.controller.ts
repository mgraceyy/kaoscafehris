import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/error-handler.js";
import {
  dateRangeQuerySchema,
  exportParamSchema,
  exportQuerySchema,
  headcountQuerySchema,
} from "./report.schema.js";
import * as reportService from "./report.service.js";
import {
  attendanceToXlsx,
  headcountToXlsx,
  payrollToXlsx,
} from "./report.xlsx.js";
import {
  attendanceToPdf,
  headcountToPdf,
  payrollToPdf,
} from "./report.pdf.js";

export async function attendanceSummary(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = dateRangeQuerySchema.parse(req.query);
    const data = await reportService.attendanceSummary(query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function payrollSummary(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = dateRangeQuerySchema.parse(req.query);
    const data = await reportService.payrollSummary(query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function headcount(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = headcountQuerySchema.parse(req.query);
    const data = await reportService.headcountSummary(query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function exportReport(
  req: Request<{ type: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { type } = exportParamSchema.parse(req.params);
    const query = exportQuerySchema.parse(req.query);
    const format = query.format;

    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    const stamp = new Date().toISOString().slice(0, 10);
    const ext = format === "pdf" ? "pdf" : "xlsx";
    contentType =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (type === "attendance") {
      const data = await reportService.attendanceSummary(query);
      buffer =
        format === "pdf" ? await attendanceToPdf(data) : await attendanceToXlsx(data);
      filename = `attendance_report_${data.range.from}_to_${data.range.to}.${ext}`;
    } else if (type === "payroll") {
      const data = await reportService.payrollSummary(query);
      buffer =
        format === "pdf" ? await payrollToPdf(data) : await payrollToXlsx(data);
      filename = `payroll_report_${data.range.from}_to_${data.range.to}.${ext}`;
    } else if (type === "headcount") {
      const data = await reportService.headcountSummary({
        branchId: query.branchId,
      });
      buffer =
        format === "pdf" ? await headcountToPdf(data) : await headcountToXlsx(data);
      filename = `headcount_report_${stamp}.${ext}`;
    } else {
      throw new AppError(400, `Unknown report type: ${type}`);
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.end(buffer);
  } catch (err) {
    next(err);
  }
}
