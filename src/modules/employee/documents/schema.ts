import { z } from "zod";

export const CreateDocumentSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.enum(["PASSPORT", "ID", "CERTIFICATE", "CONTRACT", "OTHER"]),
  name: z.string().min(1),
  // fileUrl is optional for multipart/file uploads (controller will add it when a file is uploaded)
  fileUrl: z.string().url().optional(),
  expiresAt: z.string().optional().nullable(),
});
export type CreateDocumentDto = z.infer<typeof CreateDocumentSchema>;

export const DocumentResponseSchema = CreateDocumentSchema.extend({ id: z.string(), createdAt: z.string() });
export type DocumentResponseDto = z.infer<typeof DocumentResponseSchema>;