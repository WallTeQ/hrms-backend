// import fs from 'fs';
// import path from 'path';
// import { execSync } from 'child_process';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const schemaPath = path.join(__dirname, '..', 'src', 'prisma', 'schema.prisma');
// const originalSchema = fs.readFileSync(schemaPath, 'utf8');

// let modifiedSchema = originalSchema;
// const env = process.env.NODE_ENV || 'development';

// if (env === 'development') {
//   modifiedSchema = modifiedSchema.replace(/provider = "postgresql"/, 'provider = "sqlite"');
// } else {
//   // Ensure it's postgresql for production
//   modifiedSchema = modifiedSchema.replace(/provider = "sqlite"/, 'provider = "postgresql"');
// }

// fs.writeFileSync(schemaPath, modifiedSchema);

// try {
//   execSync('npx prisma generate', { stdio: 'inherit' });
// } finally {
//   fs.writeFileSync(schemaPath, originalSchema);
// }

import { execSync } from 'child_process';

try {
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (error) {
  console.error('Error generating Prisma client:', error);
  process.exit(1);
}