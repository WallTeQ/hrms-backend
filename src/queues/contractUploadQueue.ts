import { Queue, Worker, JobsOptions } from 'bullmq';
import { uploadBuffer } from '../infra/cloudinary.js';
import { ContractsRepository } from '../modules/employee/contracts/repository.js';
import { redis } from '../infra/redis.js';
import { transporter } from '../infra/mailer.js';
import prismaDefault from '../infra/database.js';

// Use existing redis client from infra instead of creating a new connection object
const connection = redis as any;

export const contractUploadQueue = new Queue('contract-file-uploads', { connection });
// QueueScheduler is optional; not instantiated here to avoid environment-specific runtime requirements

const repo = ContractsRepository(prismaDefault);

export type ContractUploadJobData = {
  contractId: string;
  employeeId: string;
  fileBase64: string;
  filename: string;
  mimeType?: string;
  size?: number;
};

const worker = new Worker<ContractUploadJobData>(
  'contract-file-uploads',
  async (job) => {
    const { contractId, fileBase64, filename, mimeType, size, employeeId } = job.data;

    // increment attempts
    try {
      await repo.update(contractId, { uploadAttempts: { increment: 1 } as any } as any);
    } catch (err) {
      // ignore
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    const result = await uploadBuffer(buffer, filename, { folder: `employees/${employeeId}/contracts` });

    // update contract
    await repo.update(contractId, {
      fileUrl: result?.secure_url,
      publicId: result?.public_id,
      mimeType: mimeType,
      size: size,
      uploadStatus: 'SUCCEEDED',
      uploadError: null,
    } as any);

    return { ok: true };
  },
  { connection }
);

worker.on('failed', async (job, err) => {
  try {
    if (!job) return;
    // if job has exceeded attempts, mark contract failed
    const attemptsMade = job.attemptsMade ?? 0;
    const attempts = job.opts?.attempts ?? 0;
    if (attempts > 0 && attemptsMade >= attempts) {
      const contractId = (job.data as any).contractId;
      await repo.update(contractId, {
        uploadStatus: 'FAILED',
        uploadError: String(err?.message || err),
      } as any);

      // send notification if ALERT_EMAIL configured
      const alertEmail = process.env.ALERT_EMAIL;
      if (alertEmail) {
        await transporter.sendMail({
          from: process.env.FROM_EMAIL,
          to: alertEmail,
          subject: `Contract upload failed for ${contractId}`,
          text: `Upload failed: ${String(err?.message || err)}`,
        });
      }
    }
  } catch (e) {
    console.error('Failed to mark contract upload as failed', e);
  }
});

worker.on('completed', (job) => {
  // could emit events / metrics here
});

export async function enqueueContractUpload(data: ContractUploadJobData, opts?: JobsOptions) {
  const jobOpts: JobsOptions = {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false,
    ...opts,
  };
  await contractUploadQueue.add(`upload-${data.contractId}`, data, jobOpts);
}

export default { enqueueContractUpload };
