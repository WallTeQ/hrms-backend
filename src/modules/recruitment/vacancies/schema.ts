import { z } from "zod";

export const CreateVacancySchema = z.object({
  title: z.string().min(1),
  department: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  skillId: z.string().uuid().optional().nullable(),
});
export type CreateVacancyDto = z.infer<typeof CreateVacancySchema>;

export const UpdateVacancySchema = CreateVacancySchema.partial();
export type UpdateVacancyDto = z.infer<typeof UpdateVacancySchema>;

export const VacancyResponseSchema = CreateVacancySchema.extend({ id: z.string(), createdAt: z.string() });
export type VacancyResponseDto = z.infer<typeof VacancyResponseSchema>;
