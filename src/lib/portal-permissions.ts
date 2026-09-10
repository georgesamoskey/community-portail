/**
 * Permissions portail customer — miroir de eagaseke platform-control.
 */
export const Permission = {
  PORTAL_ACCESS: "portal.access",
  PORTAL_PAYMENTS: "portal.payments",
  PORTAL_COMMUNITY_MANAGE: "portal.community.manage",
} as const;

export type PermissionId = (typeof Permission)[keyof typeof Permission];

export const ROLE_PERMISSIONS: Record<string, PermissionId[]> = {
  customer: [Permission.PORTAL_ACCESS],
  customer_premium: [
    Permission.PORTAL_ACCESS,
    Permission.PORTAL_PAYMENTS,
  ],
  org_owner: [
    Permission.PORTAL_ACCESS,
    Permission.PORTAL_PAYMENTS,
    Permission.PORTAL_COMMUNITY_MANAGE,
  ],
  /** Alias legacy / membres mobile */
  user: [Permission.PORTAL_ACCESS],
  /** Accès lecture portail aussi pour le staff qui teste */
  admin: [
    Permission.PORTAL_ACCESS,
    Permission.PORTAL_PAYMENTS,
    Permission.PORTAL_COMMUNITY_MANAGE,
  ],
  super_admin: [
    Permission.PORTAL_ACCESS,
    Permission.PORTAL_PAYMENTS,
    Permission.PORTAL_COMMUNITY_MANAGE,
  ],
};

export function permissionsForRoles(
  roles: string[] | undefined | null,
): Set<PermissionId> {
  const out = new Set<PermissionId>();
  if (!roles?.length) return out;
  for (const r of roles) {
    const list = ROLE_PERMISSIONS[r];
    if (list) for (const p of list) out.add(p);
  }
  return out;
}

export function hasPermission(
  roles: string[] | undefined | null,
  required: PermissionId,
): boolean {
  if (!roles?.length) return false;
  return permissionsForRoles(roles).has(required);
}
