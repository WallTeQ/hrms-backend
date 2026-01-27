import { z } from "zod";

// Base schema without preprocess so we can call .partial() and .extend() in TypeScript
export const BaseCreateSalaryStructureSchema = z.object({
  employeeId: z.string().uuid(),
  baseSalary: z.number().nonnegative(),
  allowances: z.number().nonnegative().optional(),
  deductions: z.number().nonnegative().optional(),
  effectiveFrom: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
});

// Preprocess maps legacy keys and supplies defaults, then validates against the base schema
export const CreateSalaryStructureSchema = z.preprocess((val) => {
  if (typeof val === 'object' && val !== null) {
    const v = { ...(val as any) };
    if (v.basicSalary !== undefined && v.baseSalary === undefined) v.baseSalary = v.basicSalary;
    if (!v.effectiveFrom) v.effectiveFrom = new Date().toISOString();
    // Normalize common date formats (e.g., MM/DD/YYYY) to ISO string for consistent validation/storage
    if (v.effectiveFrom && typeof v.effectiveFrom === 'string') {
      const parsed = new Date(v.effectiveFrom);
      if (!Number.isNaN(parsed.getTime())) v.effectiveFrom = parsed.toISOString();
    }
    return v;
  }
  return val;
}, BaseCreateSalaryStructureSchema);

export type CreateSalaryStructureDto = z.infer<typeof BaseCreateSalaryStructureSchema>;

export const SalaryStructureResponseSchema = BaseCreateSalaryStructureSchema.extend({ id: z.string(), createdAt: z.string() });
export type SalaryStructureResponseDto = z.infer<typeof SalaryStructureResponseSchema>;
