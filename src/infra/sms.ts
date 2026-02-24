// Lightweight SMS helper — no-op when provider not configured.
// Supports optional `TWILIO` provider via dynamic import.

export async function sendSms(to: string, text: string) {
  const provider = (process.env.SMS_PROVIDER || "").toLowerCase();
  if (provider === "twilio" && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = await import("twilio").then((m) => (m as any).default || m);
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    try {
      return await client.messages.create({ body: text, from: process.env.SMS_FROM, to });
    } catch (err) {
      console.warn("Twilio send failed", err);
      throw err;
    }
  }

  // Fallback: log and resolve so background jobs don't fail when SMS not configured
  console.warn("SMS provider not configured — skipping SMS to", to, "message:", text);
  return Promise.resolve(null as any);
}

export default { sendSms };