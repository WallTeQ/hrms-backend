import { z } from "zod";

export const CreateProbationAssessmentSchema = z.object({
  employeeId: z.string().regex(/^EMP-\d{2}-\d{2}$/, { message: "Invalid employee ID format" }),
  startDate: z.string(),
  endDate: z.string(),
  result: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateProbationAssessmentDto = z.infer<typeof CreateProbationAssessmentSchema>;
