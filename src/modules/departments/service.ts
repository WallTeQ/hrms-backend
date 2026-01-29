import { DepartmentsRepository } from "./repository.js";
import type { Prisma } from "@prisma/client";
import prismaDefault from "../../infra/database.js";

const repo = DepartmentsRepository();

export const DepartmentsService = {
  create: async (data: Prisma.DepartmentCreateInput) => {
    const managerId = (data as any)?.managerId;
    const managerEmail = (data as any)?.managerEmail;
    const payload: any = { ...data };

    // If managerEmail provided, resolve to employee id
    if (managerEmail) {
      const manager = await prismaDefault.employee.findUnique({ where: { email: managerEmail } });
      if (!manager) throw Object.assign(new Error(`Manager with email ${managerEmail} not found`), { status: 400 });
      payload.managerId = manager.id;
      delete payload.managerEmail;
    }

    if (payload.managerId) {
      console.log('Checking manager ID:', payload.managerId);
      const manager = await prismaDefault.employee.findUnique({ where: { id: payload.managerId } });
      console.log('Manager found:', manager ? `ID: ${manager.id}, Name: ${manager.firstName} ${manager.lastName}` : 'null');
      if (!manager) {
        throw Object.assign(new Error(`Manager with id ${payload.managerId} not found`), { status: 400 });
      }
    }

    try {
      const result = await repo.create(payload);
      return result;
    } catch (error: any) {
      console.log('Caught error in department create:', error.code, error.message);
      if (error.code === 'P2002') {
        throw Object.assign(new Error('Department name already exists'), { status: 400 });
      }
      throw error;
    }
  },

  find: async (id: string) => repo.findById(id),

  update: async (id: string, data: Prisma.DepartmentUpdateInput) => {
    const managerId = (data as any)?.managerId;
    const managerEmail = (data as any)?.managerEmail;
    const payload: any = { ...data };

    // Resolve managerEmail if provided on update
    if (managerEmail) {
      const manager = await prismaDefault.employee.findUnique({ where: { email: managerEmail } });
      if (!manager) throw Object.assign(new Error(`Manager with email ${managerEmail} not found`), { status: 400 });
      payload.managerId = manager.id;
      delete payload.managerEmail;
    }

    // If managerId is explicitly provided (could be null to unset), validate existence when truthy
    if (payload.managerId !== undefined && payload.managerId !== null) {
      if (payload.managerId) {
        const manager = await prismaDefault.employee.findUnique({ where: { id: payload.managerId } });
        if (!manager) throw Object.assign(new Error(`Manager with id ${payload.managerId} not found`), { status: 400 });
      }
    }

    return repo.update(id, payload);
  },

  delete: async (id: string) => {
    // Check if department has employees
    const employeeCount = await prismaDefault.employee.count({ where: { departmentId: id } });
    if (employeeCount > 0) {
      throw Object.assign(new Error(`Cannot delete department with ${employeeCount} assigned employees. Please reassign or remove employees first.`), { status: 400 });
    }
    return repo.delete(id);
  },
  list: async (skip = 0, take = 50) => repo.list(skip, take),
  listEmployees: async (departmentId: string, skip = 0, take = 50) => repo.listEmployees(departmentId, skip, take),

  getDepartmentStats: async () => {
    const departments = await prismaDefault.department.findMany({
      include: {
        _count: {
          select: { employees: true }
        }
      }
    });

    return departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      employeeCount: dept._count.employees
    }));
  },
};