import { Router } from "express";
import { z } from "zod";
import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();
router.use(authenticate);

const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  name: z.string().trim().min(1),
  type: z.enum(["REGULAR", "SPECIAL_NON_WORKING"]),
  payRatePct: z.coerce.number().int().min(100).max(500).default(200),
});

router.get("/", async (req, res, next) => {
  try {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const holidays = await prisma.publicHoliday.findMany({
      where: {
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
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
        payRatePct: body.payRatePct,
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
        ...(body.payRatePct !== undefined && { payRatePct: body.payRatePct }),
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
