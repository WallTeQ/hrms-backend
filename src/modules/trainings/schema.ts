import { z } from "zod";

export const CreateTrainingSchema = z.object({
  title: z.string().min(1),
  budget: z.number().optional().nullable(),
  date: z.string().optional().nullable(),
  skillId: z.string().uuid().optional().nullable(),
});
export type CreateTrainingDto = z.infer<typeof CreateTrainingSchema>;

export const UpdateTrainingSchema = CreateTrainingSchema.partial();
export type UpdateTrainingDto = z.infer<typeof UpdateTrainingSchema>;

export const TrainingResponseSchema = CreateTrainingSchema.extend({ id: z.string() });
export type TrainingResponseDto = z.infer<typeof TrainingResponseSchema>;