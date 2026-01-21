import cron from "node-cron";
import prismaDefault from "../infra/database.js";
import { transporter } from "../infra/mailer.js";

// Schedule and settings
const SCHEDULE = process.env.DOCUMENTS_EXPIRY_SCHEDULE || "0 8 * * *"; // daily at 08:00
const DEFAULT_WITHIN_DAYS = Number(process.env.DOCUMENTS_EXPIRY_WITHIN_DAYS || 30);

export async function checkExpiringDocumentsOnce(withinDays = DEFAULT_WITHIN_DAYS) {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);

  // quick count check to avoid fetching rows when none match
  const expiringCount = await prismaDefault.document.count({
    where: {
      expiresAt: {
        lte: cutoff,
        gte: now,
      },
    },
  });
  if (expiringCount === 0) return { count: 0 };

  // limit number of documents included in a single report to avoid huge emails
  const REPORT_LIMIT = Number(process.env.DOCUMENTS_EXPIRY_REPORT_LIMIT || 500);
  const expiring = await prismaDefault.document.findMany({
    where: {
      expiresAt: {
        lte: cutoff,
        gte: now,
      },
    },
    include: { employee: true },
    orderBy: { expiresAt: "asc" },
    take: REPORT_LIMIT,
  });

  const byEmployee: Record<string, any[]> = {};
  for (const d of expiring) {
    const key = d.employeeId || 'unknown';
    byEmployee[key] = byEmployee[key] || [];
    byEmployee[key].push(d);
  }

  const alertEmail = process.env.ALERT_EMAIL;
  if (!alertEmail) {
    console.warn('No ALERT_EMAIL configured; skipping send of expiring documents report');
    return { count: expiring.length };
  }

  let body = `Documents expiring within ${withinDays} days (generated at ${new Date().toISOString()}):\n\n`;
  for (const [eid, docs] of Object.entries(byEmployee)) {
    body += `Employee: ${eid} (${docs[0]?.employee?.firstName || ''} ${docs[0]?.employee?.lastName || ''})\n`;
    for (const d of docs) {
      body += `  - ${d.name} (${d.type}) expires ${d.expiresAt?.toISOString()} (id: ${d.id})\n`;
    }
    body += '\n';
  }

  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: alertEmail,
      subject: `Expiring documents report - ${expiring.length} items`,
      text: body,
    });
  } catch (err) {
    console.error('Failed to send expiring documents report', err);
  }

  return { count: expiring.length };
}

export function startDocumentsExpiringChecker() {
  if (process.env.DOCUMENTS_EXPIRY_CHECK_ENABLED === 'false') return;
  // run once on startup
  void checkExpiringDocumentsOnce().catch((e) => console.error('Initial expiring documents check failed', e));
  // schedule
  cron.schedule(SCHEDULE, () => {
    void checkExpiringDocumentsOnce().catch((e) => console.error('Expiring documents check failed', e));
  });
}

export default { startDocumentsExpiringChecker, checkExpiringDocumentsOnce };