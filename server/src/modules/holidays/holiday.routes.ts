import { Router } from "express";
import { z } from "zod";
import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { COMPANY_TZ } from "../../lib/timezone.js";

const router = Router();
router.use(authenticate);

const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  name: z.string().trim().min(1),
  type: z.enum(["REGULAR", "SPECIAL_NON_WORKING"]),
  amount: z.coerce.number().nonnegative().default(0),
  percentage: z.coerce.number().min(0).max(1000).nullable().optional(),
});

router.get("/years", async (_req, res, next) => {
  try {
    const tz = COMPANY_TZ;
    const currentYear = parseInt(
      new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric" }).format(new Date()),
      10,
    );
    const rows = await prisma.publicHoliday.findMany({ select: { date: true } });
    const yearSet = new Set(rows.map((r) => r.date.getUTCFullYear()));
    yearSet.add(currentYear);
    yearSet.add(currentYear + 1);
    const years = Array.from(yearSet).sort((a, b) => a - b);
    res.json({ data: years });
  } catch (err) { next(err); }
});

router.get("/", async (req, res, next) => {
  try {
    const tz = COMPANY_TZ;
    const defaultYear = parseInt(
      new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric" }).format(new Date()),
      10,
    );
    const year = req.query.year ? Number(req.query.year) : defaultYear;
    const holidays = await prisma.publicHoliday.findMany({
      where: {
        date: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lte: new Date(`${year}-12-31T00:00:00.000Z`),
        },
      },
      orderBy: { date: "asc" },
    });
    res.json({ data: holidays });
  } catch (err) { next(err); }
});

router.post("/", authorize("ADMIN"), async (req, res, next) => {
  try {
    const body = holidaySchema.parse(req.body);
    const holiday = await prisma.publicHoliday.create({
      data: {
        date: new Date(body.date),
        name: body.name,
        type: body.type,
        amount: body.amount,
        percentage: body.percentage ?? null,
      },
    });
    res.status(201).json({ data: holiday });
  } catch (err) { next(err); }
});

router.patch("/:id", authorize("ADMIN"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const body = holidaySchema.partial().parse(req.body);
    const existing = await prisma.publicHoliday.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "Holiday not found");
    const updated = await prisma.publicHoliday.update({
      where: { id },
      data: {
        ...(body.date && { date: new Date(body.date) }),
        ...(body.name && { name: body.name }),
        ...(body.type && { type: body.type }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...("percentage" in body && { percentage: body.percentage ?? null }),
      },
    });
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.delete("/:id", authorize("ADMIN"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.publicHoliday.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "Holiday not found");
    await prisma.publicHoliday.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
