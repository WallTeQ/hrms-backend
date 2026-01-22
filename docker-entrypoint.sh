#!/bin/sh
set -e

echo "🚀 Container starting..."

# Run Prisma migrations (safe for production)
# echo "📦 Running Prisma migrations..."
# npx prisma migrate deploy --schema=prisma/schema.prisma || {
#   echo "⚠️ Prisma migrate failed (container will continue)"
# }

# Optional seeding (ONLY when explicitly enabled)
if [ "$SEED" = "true" ]; then
  echo "🌱 Running database seed..."
  npm run prisma:seed || {
    echo "⚠️ Seed failed (container will continue)"
  }
fi

echo "✅ Startup tasks completed. Launching app..."

# Hand off to CMD (node dist/server.js)
exec "$@"
