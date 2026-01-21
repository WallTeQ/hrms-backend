import cron from "node-cron";
import prismaDefault from "../infra/database.js";
import { ContractsRepository } from "../modules/employee/contracts/repository.js";
import cloudinary, { urlFor } from "../infra/cloudinary.js";
import { transporter } from "../infra/mailer.js";

const repo = ContractsRepository(prismaDefault);

// Configuration
const CHECK_SCHEDULE = process.env.CONTRACT_UPLOAD_CHECK_SCHEDULE || "*/5 * * * *"; // every 5 minutes
const STALE_MINUTES = Number(process.env.CONTRACT_UPLOAD_STALE_MINUTES || 30);
// Max number of pending contracts to process per run (limits bandwidth)
const PROCESS_LIMIT = Number(process.env.CONTRACT_UPLOAD_PROCESS_LIMIT || 20);

export async function checkPendingUploadsOnce() {
  // helper: retry a function a few times for transient DB errors
  async function withRetries<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 500) {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err: any) {
        attempt++;
        // treat ETIMEDOUT/ECONNRESET/ECONNREFUSED as transient
        const transient = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'].includes(err?.code);
        if (!transient || attempt >= attempts) throw err;
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`Transient DB error (attempt ${attempt}/${attempts}), retrying in ${delay}ms:`, err?.code || err);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  // quick check: count pending contracts and skip if none
  let pendingCount: number;
  try {
    pendingCount = await withRetries(() => prismaDefault.contract.count({ where: { uploadStatus: 'PENDING' } }));
  } catch (err) {
    console.error('Failed to count pending contracts (DB error)', err);
    return { count: 0, error: String((err as any)?.message ?? err) } as any;
  }
  if (pendingCount === 0) return { count: 0 };

  // Find a limited number of pending contracts to process (avoid heavy runs)
  const limit = Math.min(pendingCount, PROCESS_LIMIT);
  const cutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000);

  let pendings: any[] = [];
  try {
    pendings = await withRetries(() => prismaDefault.contract.findMany({
      where: { uploadStatus: 'PENDING' },
      take: limit,
      orderBy: { createdAt: 'asc' },
    }));
  } catch (err) {
    console.error('Failed to fetch pending contracts (DB error)', err);
    return { count: 0, error: String((err as any)?.message ?? err) } as any;
  }

  for (const c of pendings) {
    try {
      // If publicId exists, try to verify with Cloudinary
      if (c.publicId) {
        try {
          const resource: any = await cloudinary.api.resource(c.publicId).catch(() => null);
          if (resource) {
            // Confirmed on CDN: update contract and mark succeeded
            await repo.update(c.id, {
              fileUrl: resource.secure_url || urlFor(c.publicId as any),
              mimeType: resource.format ? `${resource.resource_type}/${resource.format}` : c.mimeType,
              size: resource.bytes || c.size,
              uploadStatus: 'SUCCEEDED',
              uploadError: null,
            } as any);
            continue;
          }
        } catch (err: any) {
          // ignore and continue to stale logic
          console.warn('Failed to fetch cloudinary resource for', c.publicId, err?.message || err);
        }
      }

      // If no publicId and contract is stale, mark as failed and notify
      if (c.createdAt < cutoff) {
        await repo.update(c.id, { uploadStatus: 'FAILED', uploadError: 'Upload not completed within threshold' } as any);

        const alertEmail = process.env.ALERT_EMAIL;
        if (alertEmail) {
          try {
            await transporter.sendMail({
              from: process.env.FROM_EMAIL,
              to: alertEmail,
              subject: `Contract upload failed for ${c.id}`,
              text: `Contract ${c.id} (employee ${c.employeeId}) was pending since ${c.createdAt.toISOString()} and has been marked FAILED by the background checker.`,
            });
          } catch (e) {
            console.error('Failed to send upload failure alert', e);
          }
        }
      }
    } catch (err) {
      console.error('Error checking pending contract upload', c.id, err);
    }
  }
  return { count: pendings.length };
}

// Schedule the checker
export function startContractUploadChecker() {
  // If disabled via env, skip
  if (process.env.CONTRACT_UPLOAD_CHECK_ENABLED === 'false') return;
  // Run immediately at startup
  void checkPendingUploadsOnce().catch((e) => console.error('Initial contract upload check failed', e));
  cron.schedule(CHECK_SCHEDULE, () => {
    void checkPendingUploadsOnce().catch((e) => console.error('Contract upload check failed', e));
  });
}

export default { startContractUploadChecker, checkPendingUploadsOnce };