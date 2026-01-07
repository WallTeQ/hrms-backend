import { z } from "zod";

export const CreateProbationAssessmentSchema = z.object({
  employeeId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  result: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateProbationAssessmentDto = z.infer<typeof CreateProbationAssessmentSchema>;
