import dotenv from "dotenv";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

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
    console.log("HR_ADMIN already exists")
    return
  }

  // Create employee first
  const employee = await prisma.employee.create({
    data: {
      firstName,
      lastName,
      email,
    },
  })

  // Create user linked to employee
  await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 12),
      role: Role.HR_ADMIN,
      employeeId: employee.id,
    },
  })

  console.log("HR_ADMIN created successfully")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })