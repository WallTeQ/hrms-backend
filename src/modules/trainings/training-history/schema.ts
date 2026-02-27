import { z } from "zod";

export const AddTrainingHistorySchema = z.object({
  employeeId: z.string().regex(/^EMP-\d{2}-\d{2}$/, { message: "Invalid employee ID format" }),
  trainingId: z.string().uuid(),
  completedAt: z.string().optional().nullable(),
  prePerformanceScore: z.number().optional().nullable(),
  postPerformanceScore: z.number().optional().nullable(),
  impactScore: z.number().optional().nullable(),
});
export type AddTrainingHistoryDto = z.infer<typeof AddTrainingHistorySchema>;

export const TrainingHistoryResponseSchema = AddTrainingHistorySchema.extend({ id: z.string() });
export type TrainingHistoryResponseDto = z.infer<typeof TrainingHistoryResponseSchema>;
