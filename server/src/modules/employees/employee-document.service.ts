import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { logAudit } from "../../lib/audit.js";

const uploadsBase =
  process.env.UPLOADS_DIR ??
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "uploads");
const documentsDir = path.join(uploadsBase, "documents");

export async function listEmployeeDocuments(employeeId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new AppError(404, "Employee not found");

  return prisma.employeeDocument.findMany({
    where: { employeeId },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function getDocumentById(docId: string, employeeId: string) {
  const doc = await prisma.employeeDocument.findFirst({
    where: { id: docId, employeeId },
  });
  if (!doc) throw new AppError(404, "Document not found");
  return doc;
}

export async function createEmployeeDocument(
  employeeId: string,
  file: { filename: string; originalname: string; mimetype: string; size: number },
  name: string
) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new AppError(404, "Employee not found");

  const doc = await prisma.employeeDocument.create({
    data: {
      employeeId,
      name,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    },
  });

  await logAudit({ action: "CREATE", tableName: "EmployeeDocument", recordId: doc.id, newValues: { name, originalName: file.originalname } });
  return doc;
}

export async function deleteEmployeeDocument(employeeId: string, docId: string) {
  const doc = await prisma.employeeDocument.findFirst({ where: { id: docId, employeeId } });
  if (!doc) throw new AppError(404, "Document not found");

  const filePath = path.join(documentsDir, doc.filename);
  try {
    await fs.unlink(filePath);
  } catch {
    // File missing on disk is not a client error — just clean up the DB record
  }

  await prisma.employeeDocument.delete({ where: { id: docId } });
  await logAudit({ action: "DELETE", tableName: "EmployeeDocument", recordId: docId, oldValues: { name: doc.name } });
}
