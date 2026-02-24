import type { PrismaClient } from "@prisma/client";

const EMP_PREFIX = "EMP-";

export function formatEmployeeId(seq: number, year: number) {
  const yearSuffix = String(year).slice(-2);
  const seqPart = String(seq).padStart(2, "0");

  return `${EMP_PREFIX}${seqPart}-${yearSuffix}`;
}

export async function generateEmployeeId(prisma: Pick<PrismaClient, "employee">, date = new Date()) {
  const year = date.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  // Fetch only the latest employee for the year (fast) and derive the next sequence.
  // Scanning the entire year's rows was causing slow create requests when the table grew large.
  const latest = await prisma.employee.findFirst({
    where: { createdAt: { gte: yearStart, lt: yearEnd } },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  const yearSuffix = String(year).slice(-2);
  if (!latest) return formatEmployeeId(1, year);

  const match = /^EMP-(\d+)[\/-](\d{2})$/.exec(latest.id);
  if (!match || match[2] !== yearSuffix) return formatEmployeeId(1, year);

  const seq = Number(match[1]);
  return formatEmployeeId((Number.isNaN(seq) ? 0 : seq) + 1, year);
}
