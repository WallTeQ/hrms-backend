import dotenv from "dotenv";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { generateEmployeeId } from "../src/common/employeeId.js";

dotenv.config();

const { Pool } = pg;

async function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = await createPrismaClient();

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL!
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD!
  const firstName = process.env.BOOTSTRAP_ADMIN_FIRST_NAME!
  const lastName = process.env.BOOTSTRAP_ADMIN_LAST_NAME!

  if (!email || !password || !firstName || !lastName) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD, BOOTSTRAP_ADMIN_FIRST_NAME, and BOOTSTRAP_ADMIN_LAST_NAME must be set")
  }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    console.log("SUPER_ADMIN already exists")
  } else {
    // ensure a default shift exists and use it for all employees
    const defaultShift = await prisma.shift.upsert({
      where: { name: "Default" },
      update: {},
      create: {
        name: "Default",
        // use a valid ShiftType value
        type: "STANDARD",
        isFlexible: false,
        punctualityApplies: true,
        expectedHours: 8,
      },
    });

    // assign the default shift to any existing employees without one
    // using raw SQL because shiftId is non-nullable in the generated types
    await prisma.$executeRaw`
      UPDATE "Employee"
      SET "shiftId" = ${defaultShift.id}
      WHERE "shiftId" IS NULL
    `;

    // Create employee first
    const employeeId = await generateEmployeeId(prisma);
    const employee = await prisma.employee.create({
      data: {
        id: employeeId,
        firstName,
        lastName,
        email,
        shift: { connect: { id: defaultShift.id } },
      },
    })

    // Create user linked to employee
    await prisma.user.create({
      data: {
        id: employee.id,
        email,
        password: await bcrypt.hash(password, 12),
        role: Role.SUPER_ADMIN,
      },
    })

    console.log("SUPER_ADMIN created successfully")
  }

  // Seed default skills (idempotent)
  const defaultSkills = [
    "Accounting",
    "Benefits Administration",
    "Budgeting",
    "Compensation",
    "Compliance",
    "Conflict Resolution",
    "Customer Service",
    "Data Analysis",
    "Employee Relations",
    "Employee Engagement",
    "Employee Onboarding",
    "Employee Offboarding",
    "Finance",
    "HR Analytics",
    "HR Operations",
    "HR Policy Development",
    "Interviewing",
    "Labor Law",
    "Leadership",
    "Learning and Development",
    "Performance Management",
    "Payroll",
    "Project Management",
    "Recruitment",
    "Succession Planning",
    "Talent Acquisition",
    "Training Facilitation",
    "Workforce Planning",
  ];

  for (const name of defaultSkills) {
    try {
      await prisma.skill.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    } catch (e) {
      console.warn("Failed to seed skill", name, e);
    }
  }

}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })