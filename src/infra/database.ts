import dotenv from "dotenv";
dotenv.config();

// // Import fs/path to create sqlite DB file when needed
// import fs from "fs";
// import path from "path";

// Import dynamically to avoid type issues if client hasn't been generated yet
import pkg from "@prisma/client";
const PrismaClient = (pkg as any).PrismaClient;

// // Default DB selection based on environment:
// // - development: default to SQLite (file:./dev.db) when DATABASE_URL isn't set
// // - production: require a single DATABASE_URL; don't compose from separate PG* vars
// const env = process.env.NODE_ENV || "development";

// if (env === "development") {
//   if (!process.env.DATABASE_URL) {
//     // Use a local file relative to project root
//     process.env.DATABASE_URL = "file:./dev.db";
//   }
// } else if (env === "production") {
//   if (!process.env.DATABASE_URL) {
//     // Fail fast in production so deployment must set DATABASE_URL explicitly
//     throw new Error('[prisma] DATABASE_URL must be set in production');
//   }
// } else {
//   // For other environments, default to SQLite if not provided
//   if (!process.env.DATABASE_URL) {
//     process.env.DATABASE_URL = "file:./dev.db";
//   }
// }

// // Prisma will pick up DATABASE_URL from env
// // If DATABASE_URL points to a local sqlite file (file:...), ensure the file exists and create it if missing
// if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
//   try {
//     const filePart = process.env.DATABASE_URL.slice('file:'.length).split('?')[0];
//     const absPath = path.resolve(process.cwd(), filePart);
//     const dir = path.dirname(absPath);
//     if (!fs.existsSync(dir)) {
//       fs.mkdirSync(dir, { recursive: true });
//     }
//     if (!fs.existsSync(absPath)) {
//       // create an empty sqlite file
//       fs.closeSync(fs.openSync(absPath, 'w'));
//       // eslint-disable-next-line no-console
//       console.info(`[prisma] Created SQLite database file at ${absPath}`);
//     }
//     // Normalize DATABASE_URL to absolute path so Prisma resolves it predictably
//     process.env.DATABASE_URL = `file:${absPath}`;
//   } catch (err) {
//     // eslint-disable-next-line no-console
//     console.warn('[prisma] Could not create SQLite DB file:', err);
//   }
// }

// // Set DATABASE_PROVIDER based on DATABASE_URL
// if (process.env.DATABASE_URL.startsWith('file:')) {
//   process.env.DATABASE_PROVIDER = 'sqlite';
// } else if (process.env.DATABASE_URL.startsWith('postgresql:')) {
//   process.env.DATABASE_PROVIDER = 'postgresql';
// } else {
//   throw new Error('Unsupported database provider');
// }

// Require DATABASE_URL to be set for PostgreSQL
if (!process.env.DATABASE_URL) {
  throw new Error('[prisma] DATABASE_URL must be set');
}

// Construct Prisma client
// For Prisma 7.x with native engine type, we need to use an adapter for PostgreSQL
async function createPrismaClient() {
  // // let prismaOptions: any = {};

  // if (process.env.DATABASE_PROVIDER === 'postgresql') {
    // Use the PostgreSQL adapter for Prisma 7.x
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const pg = await import('pg');
    const { Pool } = pg.default;
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS) || 5000 });
    const adapter = new PrismaPg(pool);
    
    // prismaOptions = { adapter };
  // }

  return new PrismaClient({ adapter });
}

// Create the prisma client instance
export const prisma = await createPrismaClient();

// Optionally enable query logging in development for easier debugging
if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e: any) => {
    // Lightweight SQL/log output; remove or reduce in production
    // eslint-disable-next-line no-console
    console.debug("[prisma]", e);
  });
}

export default prisma;
