import { DocumentsRepository } from "./repository.js";
import { deleteResource } from "../../../infra/cloudinary.js";
import { transporter } from "../../../infra/mailer.js";
import type { Prisma } from ".prisma/client";
import { uploadBuffer } from "../../../infra/cloudinary.js";
import { serviceGuard } from "../../../common/domain/service.js";
import { NotFoundError, ValidationError } from "../../../common/domain/errors.js";

const repo = DocumentsRepository();

export const DocumentsService = {
  create: async (data: Prisma.DocumentCreateInput) => serviceGuard(async () => repo.create(data)),
  createWithUpload: async (data: Prisma.DocumentCreateInput, file?: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number }) =>
    serviceGuard(async () => {
      const payload: any = { ...data };
      if (file) {
        const filename = (file.originalname || `file-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
        const result = await uploadBuffer(file.buffer, filename, { folder: `employees/${(payload as any).employeeId}` });
        payload.fileUrl = result?.secure_url;
        payload.publicId = result?.public_id;
        payload.mimeType = file.mimetype;
        payload.size = file.size;
      }

      if (!payload.fileUrl) {
        throw new ValidationError("file or fileUrl is required");
      }

      return repo.create(payload as Prisma.DocumentCreateInput);
    }),
  listForEmployee: async (employeeId: string, skip = 0, take = 50) => serviceGuard(async () => repo.listForEmployee(employeeId, skip, take)),
  find: async (id: string) => serviceGuard(async () => repo.find(id)),
  delete: async (id: string) =>
    serviceGuard(async () => {
      const doc = await repo.find(id);
      if (!doc) throw new NotFoundError("Document not found", { documentId: id });
      if (doc.publicId) {
        try {
          await deleteResource(doc.publicId);
        } catch (err: any) {
          console.error("Failed to delete document resource", doc.publicId, err?.message || err);
          const alertEmail = process.env.ALERT_EMAIL;
          if (alertEmail) {
            try {
              await transporter.sendMail({
                from: process.env.FROM_EMAIL,
                to: alertEmail,
                subject: `Failed to delete document resource ${doc.id}`,
                text: `Failed to delete Cloudinary resource ${doc.publicId} for document ${doc.id}. Error: ${String(err?.message || err)}`,
              });
            } catch (e) {
              console.error("Failed to send delete failure alert", e);
            }
          }
        }
      }
      return repo.delete(id);
    }),
  listExpiring: async (withinDays = 30) => serviceGuard(async () => repo.listExpiring(withinDays)),
};