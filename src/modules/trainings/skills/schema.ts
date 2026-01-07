import { z } from "zod";

export const CreateSkillSchema = z.object({
  name: z.string().min(1),
});
export type CreateSkillDto = z.infer<typeof CreateSkillSchema>;

export const UpdateSkillSchema = CreateSkillSchema.partial();
export type UpdateSkillDto = z.infer<typeof UpdateSkillSchema>;

export const SkillResponseSchema = CreateSkillSchema.extend({ id: z.string() });
export type SkillResponseDto = z.infer<typeof SkillResponseSchema>;
