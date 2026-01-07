
export enum Role {
  EMPLOYEE = "EMPLOYEE",
  SUPERVISOR = "SUPERVISOR",
  HR_ADMIN = "HR_ADMIN",
  BOARD = "BOARD",
}

export const ALL_ROLES = Object.values(Role) as Role[];

export type Permission = string; // string union can be refined as needs evolve

export const rolePermissions: Record<Role, Permission[]> = {
  [Role.EMPLOYEE]: ["profile:read"],
  [Role.SUPERVISOR]: ["profile:read", "team:manage"],
  [Role.HR_ADMIN]: ["*"] /* wildcard = full access for now */,
  [Role.BOARD]: ["reports:view"],
};

export function hasPermission(role: Role, permission: Permission) {
  const perms = rolePermissions[role] ?? [];
  return perms.includes("*") || perms.includes(permission);
}
