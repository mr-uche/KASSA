import type { KassaScope } from './api';

/** UI hints only: the backend must also enforce every business permission. */
export function canAccess(scope: KassaScope | null, permission: string): boolean {
  if (!scope) return false;
  if (scope.myRole === 'Owner') return true;
  const permissions = scope.myPermissions ?? [];
  if (permissions.includes('*') || permissions.includes(permission)) return true;
  return permissions.includes('Manage sales & transactions') &&
    (permission === 'Manage sales' || permission === 'View transactions');
}
