/*
  Warnings:

  - You are about to drop the column `employeeNumber` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `employeeSeq` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Employee` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Employee_employeeNumber_key";

-- DropIndex
DROP INDEX "Employee_employeeSeq_key";

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "employeeNumber",
DROP COLUMN "employeeSeq",
DROP COLUMN "phone",
ADD COLUMN     "contactNumbers" JSONB;
