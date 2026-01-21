import { EmployeeRepository } from "./repository.js";
import { ContractsRepository } from "./contracts/repository.js";
import { DocumentsRepository } from "./documents/repository.js";
import type { Prisma } from ".prisma/client";
import bcrypt from "bcrypt";
import prismaDefault from "../../infra/database.js";

const repo = EmployeeRepository();
const contractsRepo = ContractsRepository();
const docsRepo = DocumentsRepository();

export const EmployeeService = {
  create: async (data: Prisma.EmployeeCreateInput & { password?: string }) => {
    // Parse dateOfBirth if it's a string
    const createData = { ...data };
    if (typeof createData.dateOfBirth === 'string') {
      createData.dateOfBirth = new Date(createData.dateOfBirth);
    }

    if (data.password) {
      const hashed = await bcrypt.hash(data.password, 10);
      const { password, ...employeeData } = createData;
      const employee = await repo.create(employeeData);
      // Create user linked to employee
      await prismaDefault.user.create({
        data: {
          email: data.email,
          password: hashed,
          role: "EMPLOYEE",
          employeeId: employee.id,
        },
      });
      return employee;
    } else {
      const { password, ...employeeData } = createData;
      return repo.create(employeeData);
    }
  },
  getById: async (id: string, user?: any) => repo.findById(id, user),
  findByEmail: async (email: string) => repo.findByEmail(email),
  list: async (filters: { search?: string; status?: string; skip?: number; take?: number; includes?: string[] } = {}, user?: any) => repo.list(filters as any, user, filters.includes),
  update: async (id: string, data: Prisma.EmployeeUpdateInput) => {
    // Parse dateOfBirth if it's a string
    const updateData = { ...data };
    if (typeof updateData.dateOfBirth === 'string') {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }
    return repo.update(id, updateData);
  },
  delete: async (id: string) => repo.softDelete(id),

  addContract: async (employeeId: string, data: Omit<Prisma.ContractCreateInput, "employee">) =>
    contractsRepo.create({ ...data, employee: { connect: { id: employeeId } } }),

  uploadDocument: async (employeeId: string, data: Omit<Prisma.DocumentCreateInput, "employee">) =>
    docsRepo.create({ ...data, employee: { connect: { id: employeeId } } }),

  createWithContract: async (employeeData: Prisma.EmployeeCreateInput, contractData: Prisma.ContractCreateInput) =>
    repo.createWithContract(employeeData, contractData),
};