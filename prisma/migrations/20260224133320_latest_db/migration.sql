/*
  Warnings:

  - Made the column `shiftId` on table `Employee` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_shiftId_fkey";

-- AlterTable
ALTER TABLE "Employee" ALTER COLUMN "shiftId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_task_dept_duedate_id" RENAME TO "Task_departmentId_dueDate_id_idx";

-- RenameIndex
ALTER INDEX "idx_task_dept_status" RENAME TO "Task_departmentId_status_idx";

-- RenameIndex
ALTER INDEX "idx_task_dept_status_duedate_createdat" RENAME TO "Task_departmentId_status_dueDate_createdAt_idx";
