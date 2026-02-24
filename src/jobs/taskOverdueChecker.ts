import cron from "node-cron";
import prismaDefault from "../infra/database.js";

const SCHEDULE = process.env.TASK_OVERDUE_SCHEDULE || "0 7 * * *"; // daily at 07:00

export async function checkOverdueTasksOnce() {
  const now = new Date();
  const tasks = await prismaDefault.task.findMany({
    where: {
      dueDate: { lt: now },
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    select: { id: true, title: true, employeeId: true, dueDate: true },
  });

  if (tasks.length === 0) return { count: 0 };

  for (const task of tasks) {
    try {
      await prismaDefault.task.update({
        where: { id: task.id },
        data: { status: "OVERDUE" },
      });

      await prismaDefault.notification.create({
        data: {
          employeeId: task.employeeId,
          type: "TASK_OVERDUE",
          channel: "SYSTEM",
          payload: {
            taskId: task.id,
            title: task.title,
            dueDate: task.dueDate?.toISOString(),
          } as any,
        },
      });

      await prismaDefault.auditLog.create({
        data: {
          actorId: null,
          action: "TASK_OVERDUE",
          entity: "Task",
          entityId: task.id,
          details: { employeeId: task.employeeId, dueDate: task.dueDate?.toISOString() } as any,
        },
      });
    } catch (err) {
      console.error("Failed to mark task overdue", task.id, err);
    }
  }

  return { count: tasks.length };
}

export function startTaskOverdueChecker() {
  if (process.env.TASK_OVERDUE_CHECK_ENABLED === "false") return;
  void checkOverdueTasksOnce().catch((e) => console.error("Initial overdue task check failed", e));
  cron.schedule(SCHEDULE, () => {
    void checkOverdueTasksOnce().catch((e) => console.error("Overdue task check failed", e));
  });
}

export default { startTaskOverdueChecker, checkOverdueTasksOnce };
