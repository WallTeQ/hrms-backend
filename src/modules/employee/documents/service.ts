import { DocumentsRepository } from "./repository.js";
import { deleteResource } from "../../../infra/cloudinary.js";
import { transporter } from "../../../infra/mailer.js";
import type { Prisma } from ".prisma/client";

const repo = DocumentsRepository();

export const DocumentsService = {
  create: async (data: Prisma.DocumentCreateInput) => repo.create(data),
  listForEmployee: async (employeeId: string, skip = 0, take = 50) => repo.listForEmployee(employeeId, skip, take),
  find: async (id: string) => repo.find(id),
  delete: async (id: string) => {
    const doc = await repo.find(id);
    if (!doc) throw new Error("Not found");
    // Attempt to delete resource from Cloudinary if publicId exists
    if (doc.publicId) {
      try {
        await deleteResource(doc.publicId);
      } catch (err: any) {
        // Log and notify admin, but proceed to delete record
        console.error('Failed to delete document resource', doc.publicId, err?.message || err);
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
            console.error('Failed to send delete failure alert', e);
          }
        }
      }
    }
    return repo.delete(id);
  },
  listExpiring: async (withinDays = 30) => repo.listExpiring(withinDays),
};