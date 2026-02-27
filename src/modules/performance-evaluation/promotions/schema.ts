import { z } from "zod";

export const CreatePromotionSchema = z.object({
  employeeId: z.string().regex(/^EMP-\d{2}-\d{2}$/, { message: "Invalid employee ID format" }),
  effectiveDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
  newTitle: z.string().min(1),
  notes: z.string().optional().nullable(),
});
export type CreatePromotionDto = z.infer<typeof CreatePromotionSchema>;
