import { z } from "zod";

export const CreatePromotionSchema = z.object({
  employeeId: z.string().uuid(),
  effectiveDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
  newTitle: z.string().min(1),
  notes: z.string().optional().nullable(),
});
export type CreatePromotionDto = z.infer<typeof CreatePromotionSchema>;
