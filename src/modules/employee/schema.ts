import { z } from "zod";

export const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  contactNumbers: z
    .object({
      primary: z.string().optional().nullable(),
      secondary: z.string().optional().nullable(),
      other: z.array(z.string()).optional().nullable(),
    })
    .optional()
    .nullable(),
  dateOfBirth: z.string().optional().nullable(),
  dateOfEmployment: z.string().optional().nullable(),
  password: z.string().min(8),
  position: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  shiftId: z.string().uuid(),
  mobileMoneyNumber: z.string().optional().nullable(),
  complianceChecklist: z.any().optional().nullable(),
  primarySkillId: z.string().uuid().optional().nullable(),
  skillIds: z.array(z.string().uuid()).optional().nullable(),
});

export type CreateEmployeeDto = z.infer<typeof CreateEmployeeSchema>;

// For update use partial and add position
export const UpdateEmployeeSchema = CreateEmployeeSchema.partial().extend({
  position: z.string().optional(),
  // Accept photo field via multipart/form-data — validation middleware will ignore file itself
  mobileMoneyNumber: z.string().optional().nullable(),
  complianceChecklist: z.any().optional().nullable(),
  dateOfEmployment: z.string().optional().nullable(),
  primarySkillId: z.string().uuid().optional().nullable(),
  skillIds: z.array(z.string().uuid()).optional().nullable(),
  shiftId: z.string().uuid().optional().nullable(),
});
export type UpdateEmployeeDto = z.infer<typeof UpdateEmployeeSchema>;

export const ComplianceChecklistSchema = z.object({
  items: z.array(
    z.object({
      key: z.string().min(1),
      status: z.enum(["PENDING", "SUBMITTED", "APPROVED", "REJECTED"]),
      fileUrl: z.string().url().optional().nullable(),
      notes: z.string().optional().nullable(),
    })
  ).min(1),
});
export type ComplianceChecklistDto = z.infer<typeof ComplianceChecklistSchema>;

// Response schema (strip sensitive fields)
export const EmployeeResponseSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  contactNumbers: z
    .object({
      primary: z.string().optional().nullable(),
      secondary: z.string().optional().nullable(),
      other: z.array(z.string()).optional().nullable(),
    })
    .optional()
    .nullable(),
  dateOfBirth: z.string().optional().nullable(),
  dateOfEmployment: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  department: z.object({
    id: z.string(),
    name: z.string(),
  }).optional().nullable(),
  shift: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    expectedHours: z.number(),
    isFlexible: z.boolean(),
    punctualityApplies: z.boolean(),
  }).optional().nullable(),
  mobileMoneyNumber: z.string().optional().nullable(),
  complianceChecklist: z.any().optional().nullable(),
  primarySkillId: z.string().optional().nullable(),
  skills: z.array(z.object({ id: z.string(), name: z.string() })).optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EmployeeResponseDto = z.infer<typeof EmployeeResponseSchema>;