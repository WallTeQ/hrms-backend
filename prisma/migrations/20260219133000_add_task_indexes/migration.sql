-- Add composite and partial indexes to speed up department-scoped task listing and counts
-- Created: 2026-02-19

-- Composite index to support WHERE departmentId + status and ORDER BY dueDate, createdAt
CREATE INDEX IF NOT EXISTS idx_task_dept_status_duedate_createdat
  ON "Task" ("departmentId", "status", "dueDate", "createdAt");

-- Narrow index to support fast COUNT() when filtering by department+status
CREATE INDEX IF NOT EXISTS idx_task_dept_status
  ON "Task" ("departmentId", "status");

-- Index to support efficient keyset pagination on (dueDate, id) scoped by department
CREATE INDEX IF NOT EXISTS idx_task_dept_duedate_id
  ON "Task" ("departmentId", "dueDate", "id");

-- Partial index for frequent 'active' queries (status != 'COMPLETED')
-- Note: consider creating this index CONCURRENTLY in production for zero-locking
CREATE INDEX IF NOT EXISTS idx_task_dept_active_duedate
  ON "Task" ("departmentId", "dueDate", "createdAt")
  WHERE status != 'COMPLETED';
