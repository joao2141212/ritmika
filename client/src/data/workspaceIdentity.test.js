import test from 'node:test';
import assert from 'node:assert/strict';
import {
    resolveWorkspaceMembership,
    setStoredActiveWorkspaceId,
} from './workspaceIdentity.js';

const installStorage = () => {
    const values = new Map();
    globalThis.localStorage = {
        getItem: (key) => values.get(key) || null,
        setItem: (key, value) => values.set(key, String(value)),
    };
    return values;
};

test('rejects an authenticated user without a workspace membership', () => {
    installStorage();
    assert.throws(
        () => resolveWorkspaceMembership({ userId: 'user-1', memberships: [] }),
        (error) => error.code === 'WORKSPACE_MEMBERSHIP_MISSING',
    );
});

test('selects and stores the only workspace membership', () => {
    const values = installStorage();
    const member = resolveWorkspaceMembership({
        userId: 'user-1',
        memberships: [{ workspace_id: 'workspace-a', role: 'operator' }],
    });

    assert.equal(member.workspace_id, 'workspace-a');
    assert.equal(values.get('ritmika.activeWorkspaceId.user-1'), 'workspace-a');
});

test('requires an explicit selection when the user belongs to multiple workspaces', () => {
    installStorage();
    assert.throws(
        () => resolveWorkspaceMembership({
            userId: 'user-1',
            memberships: [
                { workspace_id: 'workspace-a' },
                { workspace_id: 'workspace-b' },
            ],
        }),
        (error) => error.code === 'WORKSPACE_SELECTION_REQUIRED',
    );
});

test('accepts only a stored workspace that belongs to the authenticated user', () => {
    installStorage();
    setStoredActiveWorkspaceId('user-1', 'workspace-b');
    const memberships = [
        { workspace_id: 'workspace-a' },
        { workspace_id: 'workspace-b' },
    ];

    assert.equal(
        resolveWorkspaceMembership({ userId: 'user-1', memberships }).workspace_id,
        'workspace-b',
    );

    setStoredActiveWorkspaceId('user-1', 'workspace-c');
    assert.throws(
        () => resolveWorkspaceMembership({ userId: 'user-1', memberships }),
        (error) => error.code === 'WORKSPACE_ACCESS_DENIED',
    );
});
