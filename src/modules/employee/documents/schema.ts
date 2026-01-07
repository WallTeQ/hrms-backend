import { z } from "zod";

export const CreateDocumentSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.enum(["PASSPORT", "ID", "CERTIFICATE", "CONTRACT", "OTHER"]),
  name: z.string().min(1),
  fileUrl: z.string().url(),
  expiresAt: z.string().optional().nullable(),
});
export type CreateDocumentDto = z.infer<typeof CreateDocumentSchema>;

export const DocumentResponseSchema = CreateDocumentSchema.extend({ id: z.string(), createdAt: z.string() });
export type DocumentResponseDto = z.infer<typeof DocumentResponseSchema>;