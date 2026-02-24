-- RenameIndex (only if they exist – shadow database may be out of sync)
ALTER INDEX IF EXISTS "idx_task_dept_duedate_id" RENAME TO "Task_departmentId_dueDate_id_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "idx_task_dept_status" RENAME TO "Task_departmentId_status_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "idx_task_dept_status_duedate_createdat" RENAME TO "Task_departmentId_status_dueDate_createdAt_idx";
