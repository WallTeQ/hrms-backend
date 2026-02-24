import cron from "node-cron";
import prismaDefault from "../infra/database.js";
import { LeavePolicy } from "../common/policies.js";

const SCHEDULE = process.env.LEAVE_CARRY_FORWARD_SCHEDULE || "0 2 1 * *"; // monthly on day 1 at 02:00

export async function expireCarryForwardOnce() {
  const now = new Date();
  const year = now.getFullYear();
  const expiry = new Date(year, LeavePolicy.annualCarryForwardExpiresMonths, 1);

  if (now < expiry) return { updated: 0, skipped: true };

  const balances = await prismaDefault.leaveBalance.findMany({
    where: { year, balance: { gt: LeavePolicy.annualDaysPerYear } },
  });

  let updated = 0;
  for (const b of balances) {
    const nextBalance = Math.min(b.balance, LeavePolicy.annualDaysPerYear);
    if (nextBalance === b.balance) continue;
    await prismaDefault.leaveBalance.update({
      where: { id: b.id },
      data: { balance: nextBalance },
    });

    try {
      await prismaDefault.auditLog.create({
        data: {
          actorId: null,
          action: "LEAVE_CARRY_FORWARD_EXPIRED",
          entity: "LeaveBalance",
          entityId: b.id,
          details: { employeeId: b.employeeId, year, before: b.balance, after: nextBalance } as any,
        },
      });
    } catch (err) {
      console.warn("Failed to log carry-forward expiry", err);
    }

    updated += 1;
  }

  return { updated };
}

export function startLeaveCarryForwardExpiryChecker() {
  if (process.env.LEAVE_CARRY_FORWARD_CHECK_ENABLED === "false") return;
  void expireCarryForwardOnce().catch((e) => console.error("Initial carry-forward expiry failed", e));
  cron.schedule(SCHEDULE, () => {
    void expireCarryForwardOnce().catch((e) => console.error("Carry-forward expiry failed", e));
  });
}

export default { startLeaveCarryForwardExpiryChecker, expireCarryForwardOnce };
