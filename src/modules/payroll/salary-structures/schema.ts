import { z } from "zod";

export const CreateSalaryStructureSchema = z.object({
  employeeId: z.string().uuid(),
  baseSalary: z.number().nonnegative(),
  allowances: z.number().nonnegative().optional(),
  deductions: z.number().nonnegative().optional(),
  effectiveFrom: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
});
export type CreateSalaryStructureDto = z.infer<typeof CreateSalaryStructureSchema>;

export const SalaryStructureResponseSchema = CreateSalaryStructureSchema.extend({ id: z.string(), createdAt: z.string() });
export type SalaryStructureResponseDto = z.infer<typeof SalaryStructureResponseSchema>;
