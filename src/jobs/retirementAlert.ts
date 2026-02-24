import cron from "node-cron";
import prismaDefault from "../infra/database.js";
import { transporter } from "../infra/mailer.js";
import { sendSms } from "../infra/sms.js";

const SCHEDULE = process.env.RETIREMENT_REMINDER_SCHEDULE || "0 9 * * *"; // daily at 09:00
const HR_ALERT_EMAIL = process.env.ALERT_EMAIL;
const RETIREMENT_AGE = Number(process.env.RETIREMENT_AGE || 60);
const SMS_ENABLED = process.env.RETIREMENT_SMS_ENABLED === "true";

function addYears(d: Date, years: number) {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + years);
  return x;
}

export async function checkRetirementRemindersOnce() {
  const now = new Date();
  const in6 = new Date();
  in6.setMonth(in6.getMonth() + 6);
  const in12 = new Date();
  in12.setMonth(in12.getMonth() + 12);

  // find employees with dateOfBirth set
  const candidates = await prismaDefault.employee.findMany({
    where: { dateOfBirth: { not: null }, status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true, email: true, contactNumbers: true, dateOfBirth: true },
  });

  let sent = 0;
  for (const e of candidates) {
    if (!e.dateOfBirth) continue;
    const retirementDate = addYears(new Date(e.dateOfBirth), RETIREMENT_AGE);
    // skip if already past retirement
    if (retirementDate <= now) continue;

    // determine reminder type
    let reminderType: '12M' | '6M' | null = null;
    if (retirementDate <= in6) reminderType = '6M';
    else if (retirementDate <= in12) reminderType = '12M';
    else reminderType = null;

    if (!reminderType) continue;

    // avoid duplicate notifications of the same type
    const past = await prismaDefault.auditLog.findMany({ where: { entity: 'Employee', entityId: e.id, action: 'RETIREMENT_REMINDER' } });
    const already = past.some((p: any) => (p.details as any)?.type === reminderType);
    if (already) continue;

    // Compose message
    const months = reminderType === '6M' ? 6 : 12;
    const subject = `Retirement reminder: ${e.firstName} ${e.lastName} — ${months} months`;
    const text = `Employee ${e.firstName} ${e.lastName} (id: ${e.id}) is due to retire on ${retirementDate.toISOString()} (in approx ${months} months).`;

    // Send email to HR alert email if configured
    if (HR_ALERT_EMAIL) {
      try {
        await transporter.sendMail({ from: process.env.FROM_EMAIL, to: HR_ALERT_EMAIL, subject, text });
      } catch (err) {
        console.warn('Failed to send retirement reminder email to HR', err);
      }
    }

    // Send email to employee
    if (e.email) {
      try {
        await transporter.sendMail({ from: process.env.FROM_EMAIL, to: e.email, subject, text });
      } catch (err) {
        console.warn('Failed to send retirement reminder email to employee', err);
      }
    }

    // Optional SMS notification to employee
    const primaryPhone = (e as any).contactNumbers?.primary as string | undefined;
    if (SMS_ENABLED && primaryPhone) {
      try {
        await sendSms(primaryPhone, text);
      } catch (err) {
        console.warn('Failed to send retirement reminder SMS', err);
      }
    }

    // Create HR dashboard notification
    try {
      await prismaDefault.notification.create({
        data: {
          employeeId: null,
          type: "RETIREMENT_ALERT",
          channel: "SYSTEM",
          payload: {
            employeeId: e.id,
            reminderType,
            retirementDate: retirementDate.toISOString(),
            months,
          } as any,
        },
      });
    } catch (err) {
      console.warn('Failed to create retirement dashboard notification', err);
    }

    // Generate a planning report snapshot (stored in audit log)
    try {
      await prismaDefault.auditLog.create({
        data: {
          actorId: null,
          action: 'RETIREMENT_PLANNING_REPORT',
          entity: 'Employee',
          entityId: e.id,
          details: {
            reminderType,
            retirementDate: retirementDate.toISOString(),
            months,
            employeeName: `${e.firstName} ${e.lastName}`,
          } as any,
        },
      });
    } catch (err) {
      console.warn('Failed to create retirement planning report audit log', err);
    }

    // Record in audit log so we don't resend the same reminder
    await prismaDefault.auditLog.create({ data: { actorId: null, action: 'RETIREMENT_REMINDER', entity: 'Employee', entityId: e.id, details: { type: reminderType, retirementDate: retirementDate.toISOString() } as any } });
    sent++;
  }

  return { sent };
}

export function startRetirementReminderChecker() {
  if (process.env.RETIREMENT_REMINDER_ENABLED === 'false') return;
  void checkRetirementRemindersOnce().catch((e) => console.error('Initial retirement reminders check failed', e));
  cron.schedule(SCHEDULE, () => {
    void checkRetirementRemindersOnce().catch((e) => console.error('Retirement reminders check failed', e));
  });
}

export default { startRetirementReminderChecker, checkRetirementRemindersOnce };