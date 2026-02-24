import { ContractsRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";
import { serviceGuard } from "../../../common/domain/service.js";
import { NotFoundError, ValidationError } from "../../../common/domain/errors.js";

const repo = ContractsRepository();

export const ContractsService = {
  create: async (data: Prisma.ContractCreateInput) =>
    serviceGuard(async () => {
      const createData: any = { ...data };
      if (typeof (createData as any).startDate === "string") {
        (createData as any).startDate = new Date((createData as any).startDate);
      }
      if (typeof (createData as any).endDate === "string") {
        (createData as any).endDate = (createData as any).endDate ? new Date((createData as any).endDate) : undefined;
      }
      return repo.create(createData as Prisma.ContractCreateInput);
    }),
  createWithUpload: async (data: Prisma.ContractCreateInput, file?: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number }) =>
    serviceGuard(async () => {
      const createData: any = { ...data };
      if (file) {
        createData.uploadStatus = "PENDING";
        delete createData.fileUrl;
        delete createData.publicId;
        delete createData.mimeType;
        delete createData.size;
      }
      const contract = await ContractsService.create(createData as Prisma.ContractCreateInput);
      if (file) {
        try {
          const { enqueueContractUpload } = await import("../../../queues/contractUploadQueue.js");
          const filename = (file.originalname || `contract-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
          await enqueueContractUpload({
            contractId: contract.id,
            employeeId: (createData as any).employeeId,
            fileBase64: file.buffer.toString("base64"),
            filename,
            mimeType: file.mimetype,
            size: file.size,
          });
        } catch (err) {
          console.error("Failed to enqueue contract upload", err);
        }
      }
      return { contract, uploadQueued: Boolean(file) };
    }),
  listForEmployee: async (employeeId: string, skip = 0, take = 50) => serviceGuard(async () => repo.listForEmployee(employeeId, skip, take)),
  find: async (id: string) => serviceGuard(async () => repo.find(id)),
  update: async (id: string, data: Prisma.ContractUpdateInput) =>
    serviceGuard(async () => {
      const updateData: any = { ...data };
      if (typeof (updateData as any).startDate === "string") {
        (updateData as any).startDate = new Date((updateData as any).startDate);
      }
      if (typeof (updateData as any).endDate === "string") {
        (updateData as any).endDate = (updateData as any).endDate ? new Date((updateData as any).endDate) : undefined;
      }
      return repo.update(id, updateData as Prisma.ContractUpdateInput);
    }),
  delete: async (id: string) => serviceGuard(async () => repo.delete(id)),
  listFailed: async (skip = 0, take = 50) => serviceGuard(async () => repo.listFailed(skip, take)),
  retryUpload: async (id: string, employeeId: string, file: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number }) =>
    serviceGuard(async () => {
      if (!file) throw new ValidationError("file is required to retry upload");
      const contract = await repo.find(id);
      if (!contract) throw new NotFoundError("Contract not found", { contractId: id });
      if (contract.employeeId !== employeeId) {
        throw new ValidationError("Mismatched employeeId");
      }

      await repo.update(id, { uploadStatus: "PENDING", uploadError: null, uploadAttempts: 0 } as any);
      const { enqueueContractUpload } = await import("../../../queues/contractUploadQueue.js");
      const filename = (file.originalname || `contract-retry-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
      await enqueueContractUpload({
        contractId: id,
        employeeId,
        fileBase64: file.buffer.toString("base64"),
        filename,
        mimeType: file.mimetype,
        size: file.size,
      });
      return { ok: true };
    }),
};