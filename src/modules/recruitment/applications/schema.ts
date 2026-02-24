import { z } from "zod";

const BaseApplicationSchema = z.object({
  vacancyId: z.string().uuid(),
  // Accept either a single `candidateName` or `firstName` + `lastName` as provided by some clients
  candidateName: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  resumeUrl: z.string().url().optional().nullable(),
  skillId: z.string().uuid().optional().nullable(),
});

export const CreateApplicationSchema = BaseApplicationSchema.refine((data) => !!data.candidateName || (data.firstName && data.lastName), {
  message: "Provide `candidateName` or both `firstName` and `lastName`",
  path: ["candidateName"],
});
export type CreateApplicationDto = z.infer<typeof CreateApplicationSchema>;

export const UpdateApplicationSchema = BaseApplicationSchema.partial();
export type UpdateApplicationDto = z.infer<typeof UpdateApplicationSchema>;

export const ApplicationResponseSchema = CreateApplicationSchema.extend({ id: z.string(), status: z.string(), createdAt: z.string() });
export type ApplicationResponseDto = z.infer<typeof ApplicationResponseSchema>;
