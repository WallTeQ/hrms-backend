import { z } from "zod";

export const CreateKpiSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  weight: z.number().optional().nullable(),
});
export type CreateKpiDto = z.infer<typeof CreateKpiSchema>;

export const UpdateKpiSchema = CreateKpiSchema.partial();
export type UpdateKpiDto = z.infer<typeof UpdateKpiSchema>;

export const KpiResponseSchema = CreateKpiSchema.extend({ id: z.string(), createdAt: z.string() });
export type KpiResponseDto = z.infer<typeof KpiResponseSchema>;
