import { z } from "zod";

export const AddTrainingHistorySchema = z.object({
  employeeId: z.string().uuid(),
  trainingId: z.string().uuid(),
  completedAt: z.string().optional().nullable(),
});
export type AddTrainingHistoryDto = z.infer<typeof AddTrainingHistorySchema>;

export const TrainingHistoryResponseSchema = AddTrainingHistorySchema.extend({ id: z.string() });
export type TrainingHistoryResponseDto = z.infer<typeof TrainingHistoryResponseSchema>;
