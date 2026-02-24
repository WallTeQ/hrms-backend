export const POLICY_VERSION = "v1.0";

export const AttendancePolicy = {
  workdaysPerMonth: 22,
  workdayStart: "09:00",
  workdayEnd: "17:00",
  hoursPerDay: 8,
  graceMinutes: 15,
  lateAfter: "09:15",
  earlyDepartureBefore: "16:45",
  lateCountForHalfDay: 3,
  earlyCountForHalfDay: 2,
  unapprovedAbsenceDeductionDays: 1,
  overtimeWeekdayMultiplier: 1.5,
  overtimeWeekendMultiplier: 2.0,
  maxUnapprovedAbsencesAlert: 3,
} as const;

export const PerformancePolicy = {
  weights: {
    taskCompletion: 0.4,
    attendanceConsistency: 0.25,
    punctuality: 0.15,
    supervisorEvaluation: 0.1,
    teamworkConduct: 0.1,
  },
  ratings: [
    { min: 90, label: "EXCELLENT" },
    { min: 75, label: "VERY_GOOD" },
    { min: 60, label: "SATISFACTORY" },
    { min: 50, label: "NEEDS_IMPROVEMENT" },
    { min: 0, label: "UNSATISFACTORY" },
  ] as const,
  consecutiveExcellentForPromotion: 3,
  consecutiveUnsatisfactoryForCorrective: 2,
  trainingThreshold: 60,
} as const;

export const LeavePolicy = {
  annualDaysPerYear: 20,
  annualMaxConsecutiveWithoutApproval: 10,
  annualCarryForwardDays: 5,
  annualCarryForwardExpiresMonths: 6,
  sickDaysPerYear: 10,
  sickMedicalCertificateAfterDays: 2,
  maternityDays: 90,
  paternityDays: 5,
  paidLeaveTypes: ["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "SPECIAL"] as const,
  unpaidLeaveTypes: ["UNPAID", "STUDY"] as const,
} as const;

export const PayrollPolicy = {
  workdaysPerMonth: AttendancePolicy.workdaysPerMonth,
  hoursPerDay: AttendancePolicy.hoursPerDay,
} as const;
