-- Add completedAt and errorLog columns to PayrollRun
ALTER TABLE "PayrollRun" ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "errorLog" TEXT;

-- Add unique constraint on period to prevent duplicate runs per period
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_period_key" UNIQUE ("period");
