import { z } from "zod";

export const CreateDocumentSchema = z.object({
  employeeId: z.string().regex(/^EMP-\d{2}-\d{2}$/, { message: "Invalid employee ID format" }),
  type: z.enum(["PASSPORT", "ID", "CERTIFICATE", "CONTRACT", "COMPLIANCE", "OTHER"]),
  name: z.string().min(1),
  // fileUrl is optional for multipart/file uploads (controller will add it when a file is uploaded)
  fileUrl: z.string().url().optional(),
  expiresAt: z.string().optional().nullable(),
});
export type CreateDocumentDto = z.infer<typeof CreateDocumentSchema>;

export const DocumentResponseSchema = CreateDocumentSchema.extend({ id: z.string(), createdAt: z.string() });
export type DocumentResponseDto = z.infer<typeof DocumentResponseSchema>;