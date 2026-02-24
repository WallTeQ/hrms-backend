import { EmployeeRepository } from "./repository.js";
import { ContractsRepository } from "./contracts/repository.js";
import { DocumentsRepository } from "./documents/repository.js";
import { uploadBuffer } from "../../infra/cloudinary.js";
import type { Prisma } from ".prisma/client";
import bcrypt from "bcrypt";
import prismaDefault from "../../infra/database.js";
import { serviceGuard } from "../../common/domain/service.js";
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "../../common/domain/errors.js";
import { generateEmployeeId } from "../../common/employeeId.js";

const repo = EmployeeRepository();
const contractsRepo = ContractsRepository();
const docsRepo = DocumentsRepository();

export const EmployeeService = {
  create: async (data: Prisma.EmployeeCreateInput & { password?: string; departmentId?: string; shiftId?: string }, file?: Express.Multer.File) => serviceGuard(async () => {

    try {
      // normalize input and parse dates
      const createData = { ...data } as any;
      if (typeof createData.dateOfBirth === 'string') {
        const parsed = new Date(createData.dateOfBirth);
        createData.dateOfBirth = isNaN(parsed.getTime()) ? null : parsed;
      }
      if (typeof createData.dateOfEmployment === 'string') {
        const parsed = new Date(createData.dateOfEmployment);
        if (!isNaN(parsed.getTime())) {
          createData.dateOfEmployment = parsed;
          if (!createData.hireDate) createData.hireDate = parsed;
        } else {
          createData.dateOfEmployment = null;
        }
      }

      // Start password hashing early (overlap CPU work with DB I/O)
      const hashPromise = data.password ? bcrypt.hash(data.password, 10) : Promise.resolve(null);

      // Validate related resources in parallel (email, department, shift)
    const emailCheck = createData.email ? prismaDefault.employee.findUnique({ where: { email: createData.email } }) : Promise.resolve(null);
    const departmentCheck = createData.departmentId ? prismaDefault.department.findUnique({ where: { id: createData.departmentId } }) : Promise.resolve(null);
    const shiftCheck = createData.shiftId ? prismaDefault.shift.findUnique({ where: { id: createData.shiftId } }) : Promise.resolve(null);

    const [existingEmail, department, shift] = await Promise.all([emailCheck, departmentCheck, shiftCheck]);

      if (existingEmail) throw new ConflictError('Employee already exists', { email: createData.email });

      if (createData.departmentId && typeof createData.departmentId === 'string' && createData.departmentId.trim() !== '') {
        if (!department) throw new NotFoundError(`Department with id ${createData.departmentId} not found`);
        createData.department = { connect: { id: createData.departmentId } };
      }
      delete createData.departmentId;

      // shiftId is required
      if (!createData.shiftId || typeof createData.shiftId !== 'string') throw new ValidationError('shiftId is required');
      if (!shift) throw new NotFoundError(`Shift with id ${createData.shiftId} not found`);
      createData.shift = { connect: { id: createData.shiftId } };
      delete createData.shiftId;

      // position handling
      const position = createData.position;
      if (position !== undefined) delete createData.position;

      // skills / primary skill handling (unchanged)
      if (Array.isArray(createData.skillIds)) {
        const ids = createData.skillIds as string[];
        createData.skills = { connect: ids.filter(Boolean).map((id) => ({ id })) };
        delete createData.skillIds;
      }
      if (createData.primarySkillId !== undefined) {
        const primarySkillId = createData.primarySkillId as string | null;
        if (primarySkillId) {
          createData.primarySkill = { connect: { id: primarySkillId } };
        } else {
          createData.primarySkill = { disconnect: true };
        }
        delete createData.primarySkillId;
      }

      // Helper: attempts to create an employee id and create the employee in the provided tx
      async function createWithGeneratedId(tx: any, employeePayload: any, nestedCreates: any = {}) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const id = await generateEmployeeId(tx);
          try {
            return await tx.employee.create({ data: { ...employeePayload, id, ...nestedCreates } });
          } catch (err: any) {
            if (err?.code === 'P2002') continue;
            throw err;
          }
        }
      throw new ConflictError('Failed to generate a unique employee ID');
    }

    let createdEmployee: any = null;
    let includedUser: any = null;
    let includedContracts: any[] = [];

    // Create flows (optimized): use nested creates where possible to reduce extra queries
    if (data.password) {
      const hashed = await hashPromise as string | null;
      const { password, ...employeePayload } = createData;

      if (position) {
        const result = await prismaDefault.$transaction(async (tx: any) => {
          for (let attempt = 0; attempt < 5; attempt++) {
            const employeeId = await generateEmployeeId(tx);
            try {
              const emp = await tx.employee.create({
                data: {
                  ...employeePayload,
                  id: employeeId,
                  contracts: { create: { title: position, startDate: employeePayload.hireDate || new Date() } },
                  user: { create: { email: data.email, password: hashed, role: 'EMPLOYEE' } },
                },
                include: {
                  user: { select: { id: true, email: true, role: true, createdAt: true, updatedAt: true } },
                  contracts: { select: { id: true, title: true, startDate: true, endDate: true } },
                },
              });
              return emp;
            } catch (err: any) {
              if (err?.code === 'P2002') continue;
              throw err;
            }
          }
          throw new ConflictError('Failed to generate a unique employee ID');
        });
        createdEmployee = result;
        includedUser = result.user;
        includedContracts = result.contracts || [];
      } else {
        const result = await prismaDefault.$transaction(async (tx: any) => {
          for (let attempt = 0; attempt < 5; attempt++) {
            const employeeId = await generateEmployeeId(tx);
            try {
              const emp = await tx.employee.create({
                data: { ...employeePayload, id: employeeId, user: { create: { email: data.email, password: hashed, role: 'EMPLOYEE' } } },
                include: { user: { select: { id: true, email: true, role: true, createdAt: true, updatedAt: true } } },
              });
              return emp;
            } catch (err: any) {
              if (err?.code === 'P2002') continue;
              throw err;
            }
          }
          throw new ConflictError('Failed to generate a unique employee ID');
        });
        createdEmployee = result;
        includedUser = result.user;
      }
    } else {
      const { password, ...employeePayload } = createData;
      if (position) {
        const result = await prismaDefault.$transaction(async (tx: any) => {
          return await createWithGeneratedId(tx, employeePayload, { contracts: { create: { title: position, startDate: new Date() } } });
        });
        createdEmployee = result;
        includedContracts = await prismaDefault.contract.findMany({ where: { employeeId: createdEmployee.id }, orderBy: { startDate: 'desc' }, select: { id: true, title: true, startDate: true, endDate: true } });
      } else {
        createdEmployee = await createWithGeneratedId(prismaDefault, employeePayload);
      }
    }

    // If a photo file was provided, upload and update employee record (do not re-fetch everything)
    if (file && createdEmployee?.id) {
      try {
        const filename = (file.originalname || `photo-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
        const result: any = await uploadBuffer(file.buffer, filename, { folder: `employees/${createdEmployee.id}/photos` });
        await prismaDefault.employee.update({ where: { id: createdEmployee.id }, data: {
          photoUrl: result?.secure_url,
          photoPublicId: result?.public_id,
          photoMimeType: file.mimetype,
          photoSize: file.size,
        } as any });
        // merge into local object for immediate return
        createdEmployee.photoUrl = result?.secure_url;
        createdEmployee.photoPublicId = result?.public_id;
        createdEmployee.photoMimeType = file.mimetype;
        createdEmployee.photoSize = file.size;
      } catch (err) {
        console.warn('Employee photo upload failed:', (err as any)?.message || err);
      }
    }

    // Build response object matching repo.findById shape (avoid an extra heavy fetch)
    const response = {
      id: createdEmployee.id,
      firstName: createdEmployee.firstName,
      lastName: createdEmployee.lastName,
      email: createdEmployee.email,
      contactNumbers: createdEmployee.contactNumbers ?? null,
      mobileMoneyNumber: createdEmployee.mobileMoneyNumber ?? null,
      photoUrl: createdEmployee.photoUrl ?? null,
      complianceChecklist: createdEmployee.complianceChecklist ?? null,
      dateOfBirth: createdEmployee.dateOfBirth ?? null,
      status: createdEmployee.status ?? 'ACTIVE',
      hireDate: createdEmployee.hireDate ?? null,
      dateOfEmployment: createdEmployee.dateOfEmployment ?? null,
      departmentId: createdEmployee.departmentId ?? null,
      department: department ? { id: department.id, name: department.name } : null,
      shift: shift ? { id: shift.id, name: shift.name, type: shift.type, expectedHours: shift.expectedHours, isFlexible: shift.isFlexible, punctualityApplies: shift.punctualityApplies } : null,
      primarySkillId: createdEmployee.primarySkillId ?? null,
      primarySkill: null,
      createdAt: createdEmployee.createdAt,
      updatedAt: createdEmployee.updatedAt,
      user: includedUser ?? null,
      contracts: includedContracts,
      salaryStructures: [],
      leaveBalances: [],
      skills: [],
      position: includedContracts?.[0]?.title ?? null,
      currentSalary: null,
    } as any;

    // if (PERF) console.timeEnd(TOTAL_LABEL);
    return response;
      } catch (err: any) {
        // if (PERF) console.timeEnd(TOTAL_LABEL);
          throw err;
      }
    }),
  getById: async (id: string, actor?: any) => serviceGuard(async () => {
    if (!actor?.role) {
      throw new UnauthorizedError("Authentication required");
    }
    switch (actor.role) {
      case "EMPLOYEE":
        if (!actor.employeeId || actor.employeeId !== id) {
          throw new ForbiddenError("Access denied");
        }
        break;
      case "DEPARTMENT_HEAD":
      case "PAYROLL_OFFICER":
      case "HR_ADMIN":
      case "SUPER_ADMIN":
        break;
      default:
        throw new ForbiddenError("Access denied");
    }
    const employee = await repo.findById(id);
    if (!employee) throw new NotFoundError("Employee not found", { employeeId: id });
    return employee;
  }),
  findByEmail: async (email: string) => serviceGuard(async () => repo.findByEmail(email)),
  list: async (filters: { search?: string; status?: string; skip?: number; take?: number; includes?: string[] } = {}, actor?: any) => serviceGuard(async () => {
    if (!actor?.role) {
      throw new UnauthorizedError("Authentication required");
    }
    const normalized = { ...filters } as any;

    // Ensure `includes` is ignored for list — heavy relations should only be
    // returned by `getById` or dedicated endpoints.
    delete normalized.includes;

    switch (actor.role) {
      case "EMPLOYEE":
        if (!actor.employeeId) return { items: [], total: 0 };
        normalized.employeeId = actor.employeeId;
        break;
      case "DEPARTMENT_HEAD":
      case "PAYROLL_OFFICER":
      case "HR_ADMIN":
      case "SUPER_ADMIN":
        break;
      default:
        throw new ForbiddenError("Access denied");
    }
    return repo.list(normalized as any);
  }),
  update: async (id: string, data: Prisma.EmployeeUpdateInput & { departmentId?: string | null; position?: string; shiftId?: string | null }, file?: Express.Multer.File) => serviceGuard(async () => {
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

    if (typeof (updateData as any).dateOfEmployment === 'string') {
      const parsed = new Date((updateData as any).dateOfEmployment);
      if (!isNaN(parsed.getTime())) {
        (updateData as any).dateOfEmployment = parsed;
        if (!(updateData as any).hireDate) {
          (updateData as any).hireDate = parsed;
        }
      } else {
        delete (updateData as any).dateOfEmployment;
      }
    }

    // Handle departmentId
    if (updateData.departmentId !== undefined) {
      if (updateData.departmentId && typeof updateData.departmentId === 'string' && updateData.departmentId.trim() !== '') {
        const department = await prismaDefault.department.findUnique({ where: { id: updateData.departmentId } });
        if (!department) throw new NotFoundError(`Department with id ${updateData.departmentId} not found`);
        (updateData as any).department = { connect: { id: updateData.departmentId } };
      } else {
        (updateData as any).department = { disconnect: true };
      }
      delete (updateData as any).departmentId;
    }

    // Handle shiftId
    if ((updateData as any).shiftId !== undefined) {
      const shiftId = (updateData as any).shiftId as string | null;
      if (shiftId) {
        const shift = await prismaDefault.shift.findUnique({ where: { id: shiftId } });
        if (!shift) throw new NotFoundError(`Shift with id ${shiftId} not found`);
        (updateData as any).shift = { connect: { id: shiftId } };
      } else {
        (updateData as any).shift = { disconnect: true };
      }
      delete (updateData as any).shiftId;
    }

    // Handle position update by updating the latest contract or creating one if none exists
    if (updateData.position !== undefined) {
      const latestContract = await prismaDefault.contract.findFirst({
        where: { employeeId: id },
        orderBy: { startDate: 'desc' },
        select: { id: true, title: true },
      });

      if (latestContract) {
        if (latestContract.title !== updateData.position) {
          await prismaDefault.contract.update({
            where: { id: latestContract.id },
            data: { title: updateData.position },
          });
        } else {
        }
      } else {
        // No existing contract: create an initial contract to persist position
        await prismaDefault.contract.create({
          data: {
            title: updateData.position,
            startDate: new Date(),
            employee: { connect: { id } },
          },
        });
      }

      delete (updateData as any).position;
    }

    // Handle skills and primary skill
    if ((updateData as any).skillIds !== undefined) {
      const ids = Array.isArray((updateData as any).skillIds) ? (updateData as any).skillIds : [];
      (updateData as any).skills = { set: ids.filter(Boolean).map((id: string) => ({ id })) };
      delete (updateData as any).skillIds;
    }
    if ((updateData as any).primarySkillId !== undefined) {
      const primarySkillId = (updateData as any).primarySkillId as string | null;
      if (primarySkillId) {
        (updateData as any).primarySkill = { connect: { id: primarySkillId } };
      } else {
        (updateData as any).primarySkill = { disconnect: true };
      }
      delete (updateData as any).primarySkillId;
    }

    // If a photo file is provided, upload first and include resulting fields in the update
    if (file) {
      try {
        const filename = (file.originalname || `photo-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
        const result: any = await uploadBuffer(file.buffer, filename, { folder: `employees/${id}/photos` });
        (updateData as any).photoUrl = result?.secure_url;
        (updateData as any).photoPublicId = result?.public_id;
        (updateData as any).photoMimeType = file.mimetype;
        (updateData as any).photoSize = file.size;
      } catch (err) {
        console.warn('Employee photo upload failed during update:', (err as any)?.message || err);
        // proceed without failing the update
      }
    }

    const result = await repo.update(id, updateData);
    // If position was updated, refetch to get the updated position from contract
    if (data.position !== undefined) {
      return repo.findById(id); // Refetch with position
    }
    return result;
  }),
  delete: async (id: string) => serviceGuard(async () => repo.softDelete(id)),

  updateComplianceChecklist: async (id: string, checklist: { items: Array<{ key: string; status?: string; fileUrl?: string | null }> }) =>
    serviceGuard(async () => {
      const required = (process.env.COMPLIANCE_REQUIRED_ITEMS || "ID,CONTRACT,COMPLIANCE")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      const itemKeys = new Set(checklist.items.map((item) => item.key));
      const missing = required.filter((key) => !itemKeys.has(key));
      if (missing.length > 0) {
        throw new ValidationError(`Missing required checklist items: ${missing.join(", ")}`);
      }

      const invalidFiles = checklist.items.filter(
        (item) => (item.status === "SUBMITTED" || item.status === "APPROVED") && !item.fileUrl
      );
      if (invalidFiles.length > 0) {
        throw new ValidationError("fileUrl is required for SUBMITTED/APPROVED checklist items");
      }

      return repo.update(id, { complianceChecklist: checklist } as any);
    }),

  addContract: async (employeeId: string, data: Omit<Prisma.ContractCreateInput, "employee">) =>
    serviceGuard(async () => contractsRepo.create({ ...data, employee: { connect: { id: employeeId } } })),

  uploadDocument: async (employeeId: string, data: Omit<Prisma.DocumentCreateInput, "employee">) =>
    serviceGuard(async () => docsRepo.create({ ...data, employee: { connect: { id: employeeId } } })),

  createWithContract: async (employeeData: Prisma.EmployeeCreateInput, contractData: Prisma.ContractCreateInput) =>
    serviceGuard(async () => prismaDefault.$transaction(async (tx: any) => {
      const employee = await tx.employee.create({ data: employeeData });
      const contract = await tx.contract.create({ data: contractData });
      return [employee, contract];
    })),

  uploadPhoto: async (employeeId: string, file: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number }) =>
    serviceGuard(async () => {
      const employee = await prismaDefault.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
      if (!employee) throw new NotFoundError("Employee not found", { employeeId });

      const filename = (file.originalname || `photo-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
      const result: any = await uploadBuffer(file.buffer, filename, { folder: `employees/${employeeId}/photos` });

      // Use `any` for update payload to avoid mismatch with generated prisma types until client is regenerated
      await prismaDefault.employee.update({ where: { id: employeeId }, data: {
        photoUrl: result?.secure_url,
        photoPublicId: result?.public_id,
        photoMimeType: file.mimetype,
        photoSize: file.size,
      } as any });

      return repo.findById(employeeId);
    }),
};