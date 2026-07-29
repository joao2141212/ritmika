export const MANAGER_ROLES = new Set(['owner', 'admin', 'manager']);
export const OPERATION_ROLES = new Set(['operator', 'employee']);

export const classifyAccess = (user) => {
  const role = String(user?.role || '').toLowerCase();
  const isManager = Boolean(user?.is_owner) || MANAGER_ROLES.has(role);
  const isOperator = OPERATION_ROLES.has(role);
  return { role, isManager, isOperator, canAccessOperation: isManager || isOperator };
};

export const resolvePostLoginPath = (user) => {
  const { isManager, isOperator } = classifyAccess(user);
  return isOperator && !isManager ? '/app' : '/';
};
