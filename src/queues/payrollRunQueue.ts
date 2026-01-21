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
      // Example processing: summarize existing payslips for the run
      const payslips = await prismaDefault.payslip.findMany({ where: { payrollRunId } });
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