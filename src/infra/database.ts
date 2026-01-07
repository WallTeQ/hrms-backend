import dotenv from "dotenv";
dotenv.config();

// Import dynamically to avoid type issues if client hasn't been generated yet
import pkg from "@prisma/client";
const PrismaClient = (pkg as any).PrismaClient;

// Default to SQLite in development if DATABASE_URL isn't set
if (process.env.NODE_ENV === "development" && !process.env.DATABASE_URL) {
  // Use a local file relative to project root
  process.env.DATABASE_URL = "file:./dev.db";
}

// Prisma will pick up DATABASE_URL from env
export const prisma = new PrismaClient();

// Optionally enable query logging in development for easier debugging
if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e: any) => {
    // Lightweight SQL/log output; remove or reduce in production
    // eslint-disable-next-line no-console
    console.debug("[prisma]", e);
  });
}

export default prisma;
