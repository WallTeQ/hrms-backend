import { EmployeeRepository } from "./repository";
import { ContractsRepository } from "./contracts/repository";
import { DocumentsRepository } from "./documents/repository";
import type { Prisma } from "../../generated/prisma";

const repo = EmployeeRepository();
const contractsRepo = ContractsRepository();
const docsRepo = DocumentsRepository();

export const EmployeeService = {
  create: async (data: Prisma.EmployeeCreateInput) => repo.create(data),
  getById: async (id: string) => repo.findById(id),
  findByEmail: async (email: string) => repo.findByEmail(email),
  list: async (filters: { search?: string; status?: string; skip?: number; take?: number } = {}) => repo.list(filters as any),
  update: async (id: string, data: Prisma.EmployeeUpdateInput) => repo.update(id, data),
  delete: async (id: string) => repo.softDelete(id),

  addContract: async (employeeId: string, data: Omit<Prisma.ContractCreateInput, "employee">) =>
    contractsRepo.create({ ...data, employee: { connect: { id: employeeId } } }),

  uploadDocument: async (employeeId: string, data: Omit<Prisma.DocumentCreateInput, "employee">) =>
    docsRepo.create({ ...data, employee: { connect: { id: employeeId } } }),

  createWithContract: async (employeeData: Prisma.EmployeeCreateInput, contractData: Prisma.ContractCreateInput) =>
    repo.createWithContract(employeeData, contractData),
};