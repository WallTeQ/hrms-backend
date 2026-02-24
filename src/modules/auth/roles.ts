
export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  HR_ADMIN = "HR_ADMIN",
  DEPARTMENT_HEAD = "DEPARTMENT_HEAD",
  PAYROLL_OFFICER = "PAYROLL_OFFICER",
  EMPLOYEE = "EMPLOYEE",
}

export const ALL_ROLES = Object.values(Role) as Role[];

export type Permission = string; // string union can be refined as needs evolve

export const rolePermissions: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: ["*"],
  [Role.HR_ADMIN]: [
    "employees:*",
    "departments:*",
    "attendance:*",
    "leave:*",
    "performance:*",
    "recruitment:*",
    "reports:*",
    "trainings:*",
    "trainings:recommendations:generate",
    "trainings:history:*",
    "tasks:*",
    "users:*",
    "payroll:*",
    "shifts:*",
  ],
  [Role.DEPARTMENT_HEAD]: [
    "profile:self:read",
    "employees:read",
    "departments:read",
    "attendance:list",
    "attendance:read",
    "attendance:mark",
    "attendance:update",
    "leave:request:list",
    "leave:request:approve",
    "tasks:create",
    "tasks:list",
    "tasks:update",
    "tasks:approve",
    "reports:department:read",
    "reports:attendance:read",
    "performance:records:list",
    "trainings:recommendations:list",
    "trainings:history:list",
    "recruitment:planning:read",
    "shifts:list",
    "shifts:read",
  ],
  [Role.PAYROLL_OFFICER]: [
    "payroll:process",
    "payroll:run:process",
    "payroll:runs:list",
    "payroll:runs:read",
    "payroll:summary",
    "payroll:export",
    "payroll:salary-structures:*",
    "payroll:payslips:*",
    "payroll:payslips:approve",
    "attendance:list",
    "attendance:read",
    "leave:request:list",
    "reports:payroll:read",
    "reports:salary:read",
    "shifts:list",
    "shifts:read",
  ],
  [Role.EMPLOYEE]: [
    "profile:self:read",
    "employees:read",
    "attendance:list",
    "attendance:read",
    "attendance:mark",
    "leave:request:create",
    "leave:request:read",
    "leave:request:list",
    "tasks:list",
    "performance:records:list",
    "trainings:recommendations:list",
    "trainings:history:list",
    "shifts:list",
    "shifts:read",
  ],
};

export function hasPermission(role: Role, permission: Permission) {
  const perms = rolePermissions[role] ?? [];
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;
  return perms.some((p) => p.endsWith(":*") && permission.startsWith(p.slice(0, -1)));
}
