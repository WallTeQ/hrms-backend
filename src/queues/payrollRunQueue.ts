import { Queue, Worker, JobsOptions } from 'bullmq';
import prismaDefault from '../infra/database.js';
import { redis } from '../infra/redis.js';
import { PayrollRepository } from '../modules/payroll/repository.js';
import { processPayment } from '../infra/payments.js';
import { AttendancePolicy, PayrollPolicy } from '../common/policies.js';

const connection = redis as any;
export const payrollRunQueue = new Queue('payroll-run-processor', { connection });

const repo = PayrollRepository(prismaDefault);

export type PayrollRunProcessJobData = {
  payrollRunId: string;
};

const worker = new Worker<PayrollRunProcessJobData>(
  'payroll-run-processor',
  async (job) => {
    const { payrollRunId } = job.data;

    // Try to claim the run: will only succeed if status === PENDING
    const claimed = await repo.claimPayrollRun(payrollRunId);
    if (!claimed) {
      const run = await repo.findPayrollRun(payrollRunId);
      return { skipped: true, reason: `not pending (status=${run?.status})` };
    }

    try {
      // If there are no payslips for this run yet, generate payslips for active employees using salary structures
      let payslips = await prismaDefault.payslip.findMany({ where: { payrollRunId } });
      if (!payslips || payslips.length === 0) {
        const run = await repo.findPayrollRun(payrollRunId);
        // derive month/year from run.period if available
        let year: number | undefined;
        let month: number | undefined;
        if (run?.period) {
          const parts = run.period.split("-").map(Number);
          if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
            year = parts[0];
            month = parts[1];
          }
        }

        const employees = await prismaDefault.employee.findMany({ where: { status: 'ACTIVE' } });
        const statutoryDeductions = await prismaDefault.statutoryDeduction.findMany();
        for (const emp of employees) {
          // ensure we don't duplicate
          const exists = await prismaDefault.payslip.findFirst({ where: { payrollRunId, employeeId: emp.id } });
          if (exists) continue;

          // find latest salary structure effective on or before run date
          const latestStructure = await prismaDefault.salaryStructure.findFirst({ where: { employeeId: emp.id, effectiveFrom: { lte: new Date() } }, orderBy: { effectiveFrom: 'desc' } });
          const base = latestStructure?.baseSalary ?? 0;
          const allowances = latestStructure?.allowances ?? 0;
          const deductions = latestStructure?.deductions ?? 0;
          const monthlyBase = base + allowances;

          const attendanceSummary = await getAttendanceSummary(emp.id, year, month, monthlyBase);
          const dailyRate = PayrollPolicy.workdaysPerMonth > 0 ? monthlyBase / PayrollPolicy.workdaysPerMonth : 0;
          const totalDeductionDays = attendanceSummary.absenceDays + attendanceSummary.unpaidLeaveDays + attendanceSummary.lateDeductionDays + attendanceSummary.earlyDeductionDays;
          const attendanceDaysWorked = Math.max(0, PayrollPolicy.workdaysPerMonth - totalDeductionDays);
          const absenceDeductions = dailyRate * attendanceSummary.absenceDays;
          const lateDeductions = dailyRate * attendanceSummary.lateDeductionDays;
          const earlyDeductions = dailyRate * attendanceSummary.earlyDeductionDays;
          const leaveDeductions = dailyRate * attendanceSummary.unpaidLeaveDays;

          const overtimePay = attendanceSummary.overtimePay;

          const gross = (attendanceDaysWorked / PayrollPolicy.workdaysPerMonth) * monthlyBase + overtimePay;
          const statutoryAmount = calculateStatutoryDeductions(statutoryDeductions, gross);
          const net = gross - deductions - statutoryAmount;

          try {
            const paymentMethod = emp.mobileMoneyNumber ? "MOBILE_MONEY" : "BANK_TRANSFER";
            const transactionRef = `PAY-${payrollRunId}-${emp.id}-${Date.now()}`;
            const payslip = await prismaDefault.payslip.create({ data: {
              payrollRunId,
              employeeId: emp.id,
              gross,
              net,
              month: month ?? null,
              year: year ?? null,
              overtimePay,
              absenceDeductions: absenceDeductions,
              lateDeductions: lateDeductions,
              earlyDeductions: earlyDeductions,
              leaveDeductions: leaveDeductions,
              statutoryDeductions: statutoryAmount,
              attendanceDaysWorked,
              paymentMethod,
              transactionRef,
            } as any });

            try {
              const result = await processPayment({
                method: paymentMethod,
                amount: net,
                currency: process.env.PAYROLL_CURRENCY || "GHS",
                transactionRef,
                recipient: {
                  employeeId: emp.id,
                  mobileMoneyNumber: emp.mobileMoneyNumber,
                },
              });

              if (result.status === "SUCCESS") {
                await prismaDefault.payslip.update({
                  where: { id: payslip.id },
                  data: { paidAt: new Date() } as any,
                });
              }

              await prismaDefault.auditLog.create({
                data: {
                  actorId: null,
                  action: result.status === "SUCCESS" ? "PAYROLL_PAYMENT_COMPLETED" : "PAYROLL_PAYMENT_FAILED",
                  entity: "Payslip",
                  entityId: payslip.id,
                  details: {
                    employeeId: emp.id,
                    payrollRunId,
                    paymentMethod,
                    transactionRef,
                    status: result.status,
                    message: result.message,
                  } as any,
                },
              });
            } catch (err) {
              console.error("Payment processing failed", err);
            }

            try {
              await prismaDefault.auditLog.create({
                data: {
                  actorId: null,
                  action: "PAYROLL_PAYMENT_INITIATED",
                  entity: "Payslip",
                  entityId: payslip.id,
                  details: {
                    employeeId: emp.id,
                    payrollRunId,
                    paymentMethod,
                    transactionRef,
                    gross,
                    net,
                  } as any,
                },
              });
            } catch (e) {
              console.error('Failed to create payslip audit log', e);
            }
          } catch (e) {
            console.error('Failed to create payslip for employee', emp.id, e);
          }
        }

        // reload payslips after potential generation
        payslips = await prismaDefault.payslip.findMany({ where: { payrollRunId } });
      }

      const totals = payslips.reduce(
        (acc: { gross: number; net: number }, p: any) => {
          acc.gross += p?.gross ?? 0;
          acc.net += p?.net ?? 0;
          return acc;
        },
        { gross: 0, net: 0 }
      );

      // Record an audit log entry for observability
      try {
        await prismaDefault.auditLog.create({
          data: {
            actorId: null,
            action: 'PROCESS_RUN',
            entity: 'PayrollRun',
            entityId: payrollRunId,
            details: totals as any,
          },
        });
      } catch (e) {
        // audit log failures should not fail the whole job
        console.error('Failed to create payroll run audit log', e);
      }

      // Mark run as completed (set completedAt for observability)
      await repo.updatePayrollRun(payrollRunId, { status: 'COMPLETED', completedAt: new Date() } as any);

      return { ok: true, totals };
    } catch (err) {
      // Mark failed and log (capture error details)
      try {
        await repo.updatePayrollRun(payrollRunId, { status: 'FAILED', errorLog: String((err as any)?.message ?? err) } as any);
        await prismaDefault.auditLog.create({
          data: {
            actorId: null,
            action: 'PROCESS_RUN_FAILED',
            entity: 'PayrollRun',
            entityId: payrollRunId,
            details: { error: String((err as any)?.message ?? err) } as any,
          },
        });
      } catch (e) {
        console.error('Failed to mark payroll run as failed', e);
      }
      throw err;
    }
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error('Payroll run job failed', job?.id, (err as any)?.message || err);
});

export async function enqueuePayrollRunProcess(payrollRunId: string, opts?: JobsOptions) {
  const jobOpts: JobsOptions = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false,
    jobId: `process-run-${payrollRunId}`,
    ...opts,
  };
  await payrollRunQueue.add(`process-${payrollRunId}`, { payrollRunId }, jobOpts);
}

export default { enqueuePayrollRunProcess };

async function getAttendanceSummary(employeeId: string, year?: number, month?: number, monthlyBase = 0) {
  if (!year || !month) {
    return {
      lateDeductionDays: 0,
      earlyDeductionDays: 0,
      unpaidLeaveDays: 0,
      absenceDays: 0,
      overtimePay: 0,
    };
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const records = await prismaDefault.attendance.findMany({
    where: { employeeId, date: { gte: start, lte: end } },
    include: { leaveRequest: true },
  });

  let lateCount = 0;
  let earlyCount = 0;
  let absences = 0;
  let unpaidLeaveDays = 0;
  let overtimePay = 0;

  const totalHours = PayrollPolicy.workdaysPerMonth * PayrollPolicy.hoursPerDay;
  const baseHourly = totalHours > 0 ? (monthlyBase / totalHours) : 0;

  for (const rec of records) {
    if (rec.status === 'LATE' || (rec.lateMinutes || 0) > 0) lateCount++;
    if ((rec.earlyDepartureMinutes || 0) > 0) earlyCount++;
    if (rec.status === 'ABSENT') absences++;
    if (rec.status === 'ON_LEAVE' && rec.leaveRequest && rec.leaveRequest.isPaid === false) unpaidLeaveDays++;

    if (rec.overtimeApproved && (rec.overtimeMinutes || 0) > 0) {
      const hours = rec.overtimeMinutes / 60;
      const day = rec.date.getDay();
      const multiplier = day === 0 || day === 6 ? AttendancePolicy.overtimeWeekendMultiplier : AttendancePolicy.overtimeWeekdayMultiplier;
      overtimePay += hours * baseHourly * multiplier;
    }
  }

  const lateDeductionDays = Math.floor(lateCount / AttendancePolicy.lateCountForHalfDay) * 0.5;
  const earlyDeductionDays = Math.floor(earlyCount / AttendancePolicy.earlyCountForHalfDay) * 0.5;
  return {
    lateDeductionDays,
    earlyDeductionDays,
    unpaidLeaveDays,
    absenceDays: absences,
    overtimePay,
  };
}

function calculateStatutoryDeductions(deductions: Array<{ rate: number }>, gross: number) {
  const rate = deductions.reduce((sum, d) => sum + (d.rate || 0), 0);
  return gross * (rate / 100);
}