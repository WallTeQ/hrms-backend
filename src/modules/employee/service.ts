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
  create: async (data: Prisma.EmployeeCreateInput & { password?: string; departmentId?: string }) => {
    // Parse dateOfBirth if it's a string
    const createData = { ...data };
    if (typeof createData.dateOfBirth === 'string') {
      const parsed = new Date(createData.dateOfBirth);
      if (!isNaN(parsed.getTime())) {
        createData.dateOfBirth = parsed;
      } else {
        // Invalid date, set to null
        createData.dateOfBirth = null;
      }
    }

    // Handle departmentId
    if (createData.departmentId && typeof createData.departmentId === 'string' && createData.departmentId.trim() !== '') {
      const department = await prismaDefault.department.findUnique({ where: { id: createData.departmentId } });
      if (!department) throw Object.assign(new Error(`Department with id ${createData.departmentId} not found`), { status: 400 });
      (createData as any).department = { connect: { id: createData.departmentId } };
      delete (createData as any).departmentId;
    } else {
      // Ensure departmentId is not set if invalid
      delete (createData as any).departmentId;
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
  update: async (id: string, data: Prisma.EmployeeUpdateInput & { departmentId?: string | null; position?: string }) => {
    console.log('Update payload:', data); // Debug log
    // Parse dateOfBirth if it's a string
    const updateData = { ...data };
    if (typeof updateData.dateOfBirth === 'string') {
      const parsed = new Date(updateData.dateOfBirth);
      if (!isNaN(parsed.getTime())) {
        updateData.dateOfBirth = parsed;
      } else {
        // Invalid date, remove from update data to avoid error
        delete updateData.dateOfBirth;
      }
    }

    // Handle departmentId
    if (updateData.departmentId !== undefined) {
      if (updateData.departmentId && typeof updateData.departmentId === 'string' && updateData.departmentId.trim() !== '') {
        const department = await prismaDefault.department.findUnique({ where: { id: updateData.departmentId } });
        if (!department) throw Object.assign(new Error(`Department with id ${updateData.departmentId} not found`), { status: 400 });
        (updateData as any).department = { connect: { id: updateData.departmentId } };
      } else {
        (updateData as any).department = { disconnect: true };
      }
      delete (updateData as any).departmentId;
    }

    // Handle position update by updating the latest contract
    if (updateData.position !== undefined) {
      const latestContract = await prismaDefault.contract.findFirst({
        where: { employeeId: id },
        orderBy: { startDate: 'desc' },
        select: { id: true, title: true },
      });
      if (latestContract && latestContract.title !== updateData.position) {
        await prismaDefault.contract.update({
          where: { id: latestContract.id },
          data: { title: updateData.position },
        });
        console.log('Contract updated');
      } else {
        console.log('No update needed or no contract');
      }
      delete (updateData as any).position;
    }

    console.log('Final updateData:', updateData); // Debug log
    const result = await repo.update(id, updateData);
    console.log('Update result:', result); // Debug log
    // If position was updated, refetch to get the updated position from contract
    if (data.position !== undefined) {
      return repo.findById(id, undefined); // Refetch with position
    }
    return result;
  },
  delete: async (id: string) => repo.softDelete(id),

  addContract: async (employeeId: string, data: Omit<Prisma.ContractCreateInput, "employee">) =>
    contractsRepo.create({ ...data, employee: { connect: { id: employeeId } } }),

  uploadDocument: async (employeeId: string, data: Omit<Prisma.DocumentCreateInput, "employee">) =>
    docsRepo.create({ ...data, employee: { connect: { id: employeeId } } }),

  createWithContract: async (employeeData: Prisma.EmployeeCreateInput, contractData: Prisma.ContractCreateInput) =>
    repo.createWithContract(employeeData, contractData),
};