
export enum Role {
  EMPLOYEE = "EMPLOYEE",
  SUPERVISOR = "SUPERVISOR",
  HR_ADMIN = "HR_ADMIN",
  BOARD = "BOARD",
}

export const ALL_ROLES = Object.values(Role) as Role[];

export type Permission = string; // string union can be refined as needs evolve

export const rolePermissions: Record<Role, Permission[]> = {
  [Role.EMPLOYEE]: [
    "profile:self:read",           // Can see self profile
    "supervisor:read",            // Can see direct supervisor
    "hr_contacts:read",           // Can see HR contacts (name + role only)
    "employees:read",             // Can read employees (filtered to self)
  ],
  [Role.SUPERVISOR]: [
    "profile:self:read",           // Can see self profile
    "team:reports:read",           // Can see direct reports
    "team:attendance:read",        // Can see attendance & leave of reports
    "team:profile:limited:read",   // Limited profile info of reports (name, role, status)
    "employees:read",              // Can read employees (filtered to reports)
    "attendance:read",             // Can read attendance
    "leave:read",                  // Can read leave requests
  ],
  [Role.HR_ADMIN]: [
    "*",                          // Full access to all employees, users, contracts, payroll, documents, role assignments
    "users:list",                 // Can list all users
    "users:read",                 // Can read user details
    "users:update",               // Can update users
    "users:delete",               // Can delete users
  ],
  [Role.BOARD]: [
    "reports:aggregated:read",    // Can see aggregated data (counts, KPIs, summaries)
    // No PII, no editing rights
  ],
};

export function hasPermission(role: Role, permission: Permission) {
  const perms = rolePermissions[role] ?? [];
  return perms.includes("*") || perms.includes(permission);
}
