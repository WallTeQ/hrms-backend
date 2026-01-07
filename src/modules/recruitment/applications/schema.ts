import { z } from "zod";

export const CreateApplicationSchema = z.object({
  vacancyId: z.string().uuid(),
  candidateName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  resumeUrl: z.string().url().optional().nullable(),
});
export type CreateApplicationDto = z.infer<typeof CreateApplicationSchema>;

export const UpdateApplicationSchema = CreateApplicationSchema.partial();
export type UpdateApplicationDto = z.infer<typeof UpdateApplicationSchema>;

export const ApplicationResponseSchema = CreateApplicationSchema.extend({ id: z.string(), status: z.string(), createdAt: z.string() });
export type ApplicationResponseDto = z.infer<typeof ApplicationResponseSchema>;
