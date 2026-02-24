import { z } from "zod";

export const CreateEvaluationSchema = z.object({
  employeeId: z.string().uuid(),
  kpiId: z.string().uuid().optional().nullable(),
  category: z.enum(["SUPERVISOR", "TEAMWORK"]).optional(),
  score: z.number(),
  period: z.string().min(1),
  notes: z.string().optional().nullable(),
});
export type CreateEvaluationDto = z.infer<typeof CreateEvaluationSchema>;

export const UpdateEvaluationSchema = CreateEvaluationSchema.partial();
export type UpdateEvaluationDto = z.infer<typeof UpdateEvaluationSchema>;

export const EvaluationResponseSchema = CreateEvaluationSchema.extend({ id: z.string(), createdAt: z.string() });
export type EvaluationResponseDto = z.infer<typeof EvaluationResponseSchema>;
