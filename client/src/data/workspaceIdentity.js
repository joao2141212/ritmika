const ACTIVE_WORKSPACE_KEY_PREFIX = 'ritmika.activeWorkspaceId';

const workspaceError = (code, message, context = {}) => {
    const error = new Error(message);
    error.code = code;
    error.context = context;
    return error;
};

const storageKey = (userId) => `${ACTIVE_WORKSPACE_KEY_PREFIX}.${userId}`;

export const getStoredActiveWorkspaceId = (userId) => {
    if (!userId) return '';
    try {
        return globalThis.localStorage?.getItem(storageKey(userId)) || '';
    } catch {
        return '';
    }
};

export const setStoredActiveWorkspaceId = (userId, workspaceId) => {
    if (!userId || !workspaceId) {
        throw workspaceError(
            'WORKSPACE_SELECTION_INVALID',
            'Usuário e workspace são obrigatórios para selecionar a empresa ativa.',
        );
    }
    try {
        globalThis.localStorage?.setItem(storageKey(userId), workspaceId);
    } catch {
        // A seleção continua válida nesta requisição mesmo sem storage persistente.
    }
};

export const resolveWorkspaceMembership = ({
    userId,
    memberships,
    preferredWorkspaceId = '',
}) => {
    const available = Array.isArray(memberships)
        ? memberships.filter((member) => member?.workspace_id)
        : [];

    if (available.length === 0) {
        throw workspaceError(
            'WORKSPACE_MEMBERSHIP_MISSING',
            'Usuário autenticado não possui vínculo com uma empresa no Ritmika.',
            { userId },
        );
    }

    if (available.length === 1) {
        setStoredActiveWorkspaceId(userId, available[0].workspace_id);
        return available[0];
    }

    const requestedWorkspaceId = preferredWorkspaceId || getStoredActiveWorkspaceId(userId);
    if (!requestedWorkspaceId) {
        throw workspaceError(
            'WORKSPACE_SELECTION_REQUIRED',
            'Selecione a empresa ativa para continuar.',
            { userId, workspaceCount: available.length },
        );
    }

    const selected = available.find((member) => member.workspace_id === requestedWorkspaceId);
    if (!selected) {
        throw workspaceError(
            'WORKSPACE_ACCESS_DENIED',
            'A empresa selecionada não pertence ao usuário autenticado.',
            { userId, workspaceId: requestedWorkspaceId, workspaceCount: available.length },
        );
    }

    setStoredActiveWorkspaceId(userId, selected.workspace_id);
    return selected;
};
