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

export const TrainingRecommendationQuerySchema = z.object({
  employeeId: z.string().regex(/^EMP-\d{2}-\d{2}$/, { message: "Invalid employee ID format" }).optional(),
  status: z.string().optional(),
});
export type TrainingRecommendationQueryDto = z.infer<typeof TrainingRecommendationQuerySchema>;

export const UpdateTrainingRecommendationSchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "COMPLETED", "REJECTED"]),
});
export type UpdateTrainingRecommendationDto = z.infer<typeof UpdateTrainingRecommendationSchema>;

export const TrainingGapRecommendationQuerySchema = z.object({
  employeeId: z.string().regex(/^EMP-\d{2}-\d{2}$/, { message: "Invalid employee ID format" }).optional(),
});
export type TrainingGapRecommendationQueryDto = z.infer<typeof TrainingGapRecommendationQuerySchema>;