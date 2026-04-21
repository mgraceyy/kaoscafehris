import prisma from "../config/db.js";

/** Read a single system setting value, falling back to `defaultValue`. */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (!row) return defaultValue;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return row.value as unknown as T;
  }
}
