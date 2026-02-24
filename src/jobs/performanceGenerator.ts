import cron from "node-cron";
import { PerformanceService } from "../modules/performance-evaluation/service.js";

// schedule expression for performance generation; default to midnight on the 1st of each month
const SCHEDULE = process.env.PERFORMANCE_GENERATOR_SCHEDULE || "0 0 1 * *";

/**
 * Generate performance records for a given period (YYYY-MM). If no period is
 * provided the previous month is chosen (so running at start of month computes
 * the just-completed month).
 */
export async function generatePerformanceOnce(period?: string) {
  let target = period;
  if (!target) {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0 = January
    if (month === 0) {
      year -= 1;
      month = 12;
    }
    target = `${year}-${String(month).padStart(2, "0")}`;
  }
  return PerformanceService.generateMonthlyPerformance(target);
}

export function startPerformanceGenerator() {
  if (process.env.PERFORMANCE_GENERATOR_ENABLED === 'false') return;
  // run once at startup
  void generatePerformanceOnce().catch((e) => console.error('Initial performance generation failed', e));
  cron.schedule(SCHEDULE, () => {
    void generatePerformanceOnce().catch((e) => console.error('Scheduled performance generation failed', e));
  });
}

export default { startPerformanceGenerator, generatePerformanceOnce };
