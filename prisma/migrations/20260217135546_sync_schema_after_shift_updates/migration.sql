/*
  Warnings:

  - The values [SUPERVISOR,BOARD] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - The `status` column on the `LeaveRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[employeeSeq]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employeeId,year]` on the table `LeaveBalance` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING_SUPERVISOR', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceEntryMethod" AS ENUM ('SYSTEM', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MOBILE_MONEY', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PerformanceRating" AS ENUM ('EXCELLENT', 'VERY_GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT', 'UNSATISFACTORY');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EvaluationCategory" AS ENUM ('SUPERVISOR', 'TEAMWORK');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('STANDARD', 'NIGHT', 'ROTATIONAL', 'FLEXIBLE');

-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'ON_LEAVE';

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'COMPLIANCE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeaveType" ADD VALUE 'MATERNITY';
ALTER TYPE "LeaveType" ADD VALUE 'PATERNITY';
ALTER TYPE "LeaveType" ADD VALUE 'STUDY';

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'HR_ADMIN', 'DEPARTMENT_HEAD', 'PAYROLL_OFFICER', 'EMPLOYEE');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';
COMMIT;

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "skillId" TEXT;

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "earlyDepartureMinutes" INTEGER,
ADD COLUMN     "entryMethod" "AttendanceEntryMethod" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN     "lateMinutes" INTEGER,
ADD COLUMN     "leaveRequestId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "overtimeApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overtimeMinutes" INTEGER,
ADD COLUMN     "recordedByUserId" TEXT,
ADD COLUMN     "workMinutes" INTEGER;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "complianceChecklist" JSONB,
ADD COLUMN     "dateOfEmployment" TIMESTAMP(3),
ADD COLUMN     "employeeSeq" SERIAL NOT NULL,
ADD COLUMN     "mobileMoneyNumber" TEXT,
ADD COLUMN     "photoMimeType" TEXT,
ADD COLUMN     "photoPublicId" TEXT,
ADD COLUMN     "photoSize" INTEGER,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "primarySkillId" TEXT,
ADD COLUMN     "shiftId" TEXT;

-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "category" "EvaluationCategory" NOT NULL DEFAULT 'SUPERVISOR';

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "finalApprovedAt" TIMESTAMP(3),
ADD COLUMN     "finalApprovedByUserId" TEXT,
ADD COLUMN     "hrApprovedAt" TIMESTAMP(3),
ADD COLUMN     "hrApprovedByUserId" TEXT,
ADD COLUMN     "isPaid" BOOLEAN DEFAULT true,
ADD COLUMN     "medicalCertificateUrl" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "specialApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supervisorApprovedAt" TIMESTAMP(3),
ADD COLUMN     "supervisorApprovedByUserId" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING_SUPERVISOR';

-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "errorLog" TEXT;

-- AlterTable
ALTER TABLE "Payslip" ADD COLUMN     "absenceDeductions" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedByUserId" TEXT,
ADD COLUMN     "attendanceDaysWorked" DOUBLE PRECISION,
ADD COLUMN     "earlyDeductions" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "lateDeductions" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "leaveDeductions" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "loanDeductions" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "overtimePay" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "statutoryDeductions" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "transactionRef" TEXT;

-- AlterTable
ALTER TABLE "TrainingHistory" ADD COLUMN     "impactScore" DOUBLE PRECISION,
ADD COLUMN     "postPerformanceScore" DOUBLE PRECISION,
ADD COLUMN     "prePerformanceScore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Vacancy" ADD COLUMN     "skillId" TEXT;

-- CreateTable
CREATE TABLE "TrainingRecommendation" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "skillId" TEXT,
    "trainingId" TEXT,
    "period" TEXT,
    "reason" TEXT,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "performanceWeight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "createdByUserId" TEXT,
    "employeeId" TEXT NOT NULL,
    "departmentId" TEXT,
    "skillId" TEXT,
    "requiredShiftId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ShiftType" NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "expectedHours" DOUBLE PRECISION NOT NULL,
    "graceMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyDepartureMinutes" INTEGER NOT NULL DEFAULT 0,
    "punctualityApplies" BOOLEAN NOT NULL DEFAULT true,
    "isFlexible" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "taskScore" DOUBLE PRECISION NOT NULL,
    "attendanceScore" DOUBLE PRECISION NOT NULL,
    "punctualityScore" DOUBLE PRECISION NOT NULL,
    "supervisorScore" DOUBLE PRECISION NOT NULL,
    "teamworkScore" DOUBLE PRECISION NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "rating" "PerformanceRating" NOT NULL,
    "flagPromotionReview" BOOLEAN NOT NULL DEFAULT false,
    "flagCorrectiveAction" BOOLEAN NOT NULL DEFAULT false,
    "flagTrainingRecommendation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payload" JSONB,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EmployeeToSkill" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EmployeeToSkill_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "TrainingRecommendation_employeeId_idx" ON "TrainingRecommendation"("employeeId");

-- CreateIndex
CREATE INDEX "TrainingRecommendation_skillId_idx" ON "TrainingRecommendation"("skillId");

-- CreateIndex
CREATE INDEX "TrainingRecommendation_trainingId_idx" ON "TrainingRecommendation"("trainingId");

-- CreateIndex
CREATE INDEX "Task_employeeId_idx" ON "Task"("employeeId");

-- CreateIndex
CREATE INDEX "Task_departmentId_idx" ON "Task"("departmentId");

-- CreateIndex
CREATE INDEX "Task_skillId_idx" ON "Task"("skillId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_requiredShiftId_idx" ON "Task"("requiredShiftId");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_name_key" ON "Shift"("name");

-- CreateIndex
CREATE INDEX "Shift_type_idx" ON "Shift"("type");

-- CreateIndex
CREATE INDEX "Shift_active_idx" ON "Shift"("active");

-- CreateIndex
CREATE INDEX "PerformanceRecord_period_idx" ON "PerformanceRecord"("period");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceRecord_employeeId_period_key" ON "PerformanceRecord"("employeeId", "period");

-- CreateIndex
CREATE INDEX "Notification_employeeId_idx" ON "Notification"("employeeId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "_EmployeeToSkill_B_index" ON "_EmployeeToSkill"("B");

-- CreateIndex
CREATE INDEX "Attendance_recordedByUserId_idx" ON "Attendance"("recordedByUserId");

-- CreateIndex
CREATE INDEX "Attendance_leaveRequestId_idx" ON "Attendance"("leaveRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeSeq_key" ON "Employee"("employeeSeq");

-- CreateIndex
CREATE INDEX "Employee_primarySkillId_idx" ON "Employee"("primarySkillId");

-- CreateIndex
CREATE INDEX "Employee_shiftId_idx" ON "Employee"("shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_employeeId_year_key" ON "LeaveBalance"("employeeId", "year");

-- CreateIndex
CREATE INDEX "Payslip_approvedByUserId_idx" ON "Payslip"("approvedByUserId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_primarySkillId_fkey" FOREIGN KEY ("primarySkillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_supervisorApprovedByUserId_fkey" FOREIGN KEY ("supervisorApprovedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_hrApprovedByUserId_fkey" FOREIGN KEY ("hrApprovedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_finalApprovedByUserId_fkey" FOREIGN KEY ("finalApprovedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecommendation" ADD CONSTRAINT "TrainingRecommendation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecommendation" ADD CONSTRAINT "TrainingRecommendation_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecommendation" ADD CONSTRAINT "TrainingRecommendation_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_requiredShiftId_fkey" FOREIGN KEY ("requiredShiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeToSkill" ADD CONSTRAINT "_EmployeeToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeToSkill" ADD CONSTRAINT "_EmployeeToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
