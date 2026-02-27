import { z } from "zod";

export const CreatePayslipSchema = z.object({
  // Clients must provide month and year (we create/find the payroll run on their behalf)
  month: z.preprocess((v) => {
    if (typeof v === "string" && v.trim() !== "") return Number(v);
    return v;
  }, z.number().int().min(1).max(12)),
  year: z.preprocess((v) => {
    if (typeof v === "string" && v.trim() !== "") return Number(v);
    return v;
  }, z.number().int().min(1970)),
  employeeId: z.string().regex(/^EMP-\d{2}-\d{2}$/, { message: "Invalid employee ID format" }),
  // Accept numbers sent as strings (multipart form-data) or as numbers in JSON
  gross: z.preprocess((v) => {
    if (typeof v === "string" && v.trim() !== "") return Number(v);
    return v;
  }, z.number().optional()),
  net: z.preprocess((v) => {
    if (typeof v === "string" && v.trim() !== "") return Number(v);
    return v;
  }, z.number().optional()),
});
export type CreatePayslipDto = z.infer<typeof CreatePayslipSchema>;

export const PayslipResponseSchema = z.object({
  id: z.string(),
  payrollRunId: z.string(),
  employeeId: z.string(),
  gross: z.number(),
  net: z.number(),
  month: z.number(),
  year: z.number(),
  fileUrl: z.string().nullable(),
  publicId: z.string().nullable(),
  mimeType: z.string().nullable(),
  size: z.number().nullable(),
  generatedAt: z.string(),
});
export type PayslipResponseDto = z.infer<typeof PayslipResponseSchema>;
