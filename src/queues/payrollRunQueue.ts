import { Queue, Worker, JobsOptions } from 'bullmq';
import prismaDefault from '../infra/database.js';
import { redis } from '../infra/redis.js';
import { PayrollRepository } from '../modules/payroll/repository.js';

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
        for (const emp of employees) {
          // ensure we don't duplicate
          const exists = await prismaDefault.payslip.findFirst({ where: { payrollRunId, employeeId: emp.id } });
          if (exists) continue;

          // find latest salary structure effective on or before run date
          const latestStructure = await prismaDefault.salaryStructure.findFirst({ where: { employeeId: emp.id, effectiveFrom: { lte: new Date() } }, orderBy: { effectiveFrom: 'desc' } });
          const base = latestStructure?.baseSalary ?? 0;
          const allowances = latestStructure?.allowances ?? 0;
          const deductions = latestStructure?.deductions ?? 0;
          const gross = base + allowances;
          const net = gross - deductions;

          try {
            await prismaDefault.payslip.create({ data: { payrollRunId, employeeId: emp.id, gross, net, month: month ?? null, year: year ?? null } as any });
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