import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { clearServerState } from '../lib/serverState';
import { resolveWorkspaceMembership } from '../data/workspaceIdentity';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [workspaceSelection, setWorkspaceSelection] = useState(null);

    const prepareWorkspaceSelection = useCallback(async (userId, memberships) => {
        const workspaceIds = memberships.map((membership) => membership.workspace_id);
        const { data: workspaces, error } = await supabase
            .from('ritmika_workspaces')
            .select('id,name,source_system')
            .in('id', workspaceIds);
        if (error) throw error;
        const workspaceById = new Map((workspaces || []).map((workspace) => [workspace.id, workspace]));
        setWorkspaceSelection({
            userId,
            memberships,
            options: memberships.map((membership) => ({
                ...membership,
                workspace: workspaceById.get(membership.workspace_id) || {
                    id: membership.workspace_id,
                    name: 'Empresa sem nome',
                    source_system: '',
                },
            })),
        });
    }, []);

    const loadUserProfile = useCallback(async (userId) => {
        try {
            const { data: memberships, error: membershipError } = await supabase
                .from('ritmika_workspace_members')
                .select('workspace_id,role,is_owner,managed_units,preferences')
                .eq('user_id', userId);

            if (membershipError) throw membershipError;
            let membership;
            try {
                membership = resolveWorkspaceMembership({ userId, memberships });
            } catch (workspaceError) {
                if (['WORKSPACE_SELECTION_REQUIRED', 'WORKSPACE_ACCESS_DENIED'].includes(workspaceError?.code)) {
                    await prepareWorkspaceSelection(userId, memberships || []);
                    setUser(null);
                    return { success: false, requiresWorkspaceSelection: true };
                }
                throw workspaceError;
            }

            const { data: profile, error } = await supabase
                .from('ritmika_profiles')
                .select('id,workspace_id,source_user_id,auth_user_id,email,name,phone,role,is_owner,managed_units,preferences,metadata')
                .eq('auth_user_id', userId)
                .eq('workspace_id', membership.workspace_id)
                .maybeSingle();

            if (error) throw error;

            if (profile) {
                setUser(profile);
                setWorkspaceSelection(null);
                return { success: true, user: profile };
            }

            const { data: authData } = await supabase.auth.getUser();
            const fallbackUser = {
                id: userId,
                workspace_id: membership.workspace_id,
                name: authData?.user?.user_metadata?.name || authData?.user?.email || 'Usuário Ritmika',
                email: authData?.user?.email || '',
                role: membership.role || authData?.user?.user_metadata?.role || 'operator',
                is_owner: Boolean(membership.is_owner),
                managed_units: membership.managed_units || [],
                preferences: membership.preferences || {},
            };
            setUser(fallbackUser);
            setWorkspaceSelection(null);
            return { success: true, user: fallbackUser };
        } catch (error) {
            logger.error({
                fn: 'AuthContext.loadUserProfile',
                status: 'error',
                userId,
                errorCode: error?.code || 'AUTH_PROFILE_LOAD_FAILED',
                context: error?.context || {},
                error: error instanceof Error ? error.message : String(error),
            });
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        } finally {
            setLoading(false);
        }
    }, [prepareWorkspaceSelection]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                loadUserProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                loadUserProfile(session.user.id);
            } else {
                if (event === 'SIGNED_OUT') clearServerState('auth.signed_out');
                setUser(null);
                setWorkspaceSelection(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [loadUserProfile]);

    const selectWorkspace = async (workspaceId) => {
        if (!workspaceSelection?.userId) {
            return { success: false, error: 'Não há uma seleção de empresa pendente.' };
        }
        try {
            clearServerState('workspace.changed');
            resolveWorkspaceMembership({
                userId: workspaceSelection.userId,
                memberships: workspaceSelection.memberships,
                preferredWorkspaceId: workspaceId,
            });
            setWorkspaceSelection(null);
            setLoading(true);
            return await loadUserProfile(workspaceSelection.userId);
        } catch (error) {
            logger.error({
                fn: 'AuthContext.selectWorkspace',
                status: 'error',
                userId: workspaceSelection.userId,
                workspaceId,
                errorCode: error?.code || 'WORKSPACE_SELECTION_FAILED',
                error: error instanceof Error ? error.message : String(error),
            });
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    };

    const login = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return { success: false, error: error.message };
            }

            return await loadUserProfile(data.user.id);
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setWorkspaceSelection(null);
    };

    const changePassword = async (password) => {
        const normalizedPassword = String(password || '');
        if (normalizedPassword.length < 12) {
            return { success: false, error: 'A nova senha precisa ter pelo menos 12 caracteres.' };
        }
        try {
            const { error } = await supabase.auth.updateUser({
                password: normalizedPassword,
                data: {
                    must_change_password: false,
                    password_changed_at: new Date().toISOString(),
                },
            });
            if (error) {
                console.error({
                    fn: 'AuthContext.changePassword',
                    status: 'error',
                    error: error.message,
                    userId: user?.id || null,
                });
                return { success: false, error: error.message };
            }
            return { success: true };
        } catch (error) {
            console.error({
                fn: 'AuthContext.changePassword',
                status: 'error',
                error: error instanceof Error ? error.message : String(error),
                userId: user?.id || null,
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Não foi possível alterar a senha.',
            };
        }
    };

    const signup = async (email, password, name, role = 'employee') => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        role
                    }
                }
            });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            changePassword,
            signup,
            loading,
            workspaceSelection,
            selectWorkspace,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
