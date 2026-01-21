-- AlterTable
ALTER TABLE "Payslip" ADD COLUMN     "month" INTEGER,
ADD COLUMN     "year" INTEGER;

-- CreateIndex
CREATE INDEX "Payslip_year_month_idx" ON "Payslip"("year", "month");
