import { z } from "zod";

export const CreateStatutoryDeductionSchema = z.object({
  name: z.string().min(1),
  rate: z.number().nonnegative(),
});
export type CreateStatutoryDeductionDto = z.infer<typeof CreateStatutoryDeductionSchema>;

export const UpdateStatutoryDeductionSchema = CreateStatutoryDeductionSchema.partial();
export type UpdateStatutoryDeductionDto = z.infer<typeof UpdateStatutoryDeductionSchema>;

export const StatutoryDeductionResponseSchema = CreateStatutoryDeductionSchema.extend({ id: z.string() });
export type StatutoryDeductionResponseDto = z.infer<typeof StatutoryDeductionResponseSchema>;
