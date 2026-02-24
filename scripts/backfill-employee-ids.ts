import { PrismaClient } from "@prisma/client";
import { formatEmployeeId } from "../src/common/employeeId.js";

const prisma = new PrismaClient();

async function backfillEmployeeIds() {
  const employees = await prisma.employee.findMany({
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const yearCounters = new Map<number, number>();
  const idMappings: Array<{ oldId: string; newId: string }> = [];

  for (const employee of employees) {
    const year = employee.createdAt.getFullYear();
    const nextSeq = (yearCounters.get(year) || 0) + 1;
    yearCounters.set(year, nextSeq);
    const newId = formatEmployeeId(nextSeq, year);
    idMappings.push({ oldId: employee.id, newId });
  }

  await prisma.$transaction(async (tx) => {
    for (const mapping of idMappings) {
      if (mapping.oldId === mapping.newId) continue;
      await tx.$executeRaw`
        UPDATE "Employee"
        SET "id" = ${mapping.newId}
        WHERE "id" = ${mapping.oldId}
      `;
    }
  });

  const users = await prisma.user.findMany({
    where: { employeeId: { not: null } },
    select: { id: true, employeeId: true },
  });

  const userMappings: Array<{ oldId: string; newId: string }> = [];
  for (const user of users) {
    if (!user.employeeId) continue;
    if (user.id === user.employeeId) continue;
    userMappings.push({ oldId: user.id, newId: user.employeeId });
  }

  await prisma.$transaction(async (tx) => {
    for (const mapping of userMappings) {
      await tx.$executeRaw`
        UPDATE "User"
        SET "id" = ${mapping.newId}
        WHERE "id" = ${mapping.oldId}
      `;
      await tx.auditLog.updateMany({
        where: { actorId: mapping.oldId },
        data: { actorId: mapping.newId },
      });
    }
  });

  console.log(`Employee IDs updated: ${idMappings.length}`);
  console.log(`User IDs updated: ${userMappings.length}`);
}

backfillEmployeeIds()
  .catch((err) => {
    console.error("Backfill failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
