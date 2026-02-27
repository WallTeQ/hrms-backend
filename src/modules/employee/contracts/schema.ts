import { z } from "zod";

export const CreateContractSchema = z.object({
  employeeId: z.string().regex(/^EMP-\d{2}-\d{2}$/, { message: "Invalid employee ID format" }),
  title: z.string().min(1),
  startDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
  endDate: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
});
export type CreateContractDto = z.infer<typeof CreateContractSchema>;

export const ContractResponseSchema = CreateContractSchema.extend({ id: z.string(), createdAt: z.string(), updatedAt: z.string() });
export type ContractResponseDto = z.infer<typeof ContractResponseSchema>;