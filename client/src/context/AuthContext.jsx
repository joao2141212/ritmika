import { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                loadUserProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                loadUserProfile(session.user.id);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadUserProfile = async (userId) => {
        try {
            const { data: profile, error } = await supabase
                .from('ritmika_profiles')
                .select('id,workspace_id,source_user_id,auth_user_id,email,name,phone,role,is_owner,managed_units,preferences,metadata')
                .eq('auth_user_id', userId)
                .maybeSingle();

            if (error) throw error;

            if (profile) {
                setUser(profile);
                return;
            }

            const { data: authData } = await supabase.auth.getUser();
            setUser({
                id: userId,
                name: authData?.user?.user_metadata?.name || authData?.user?.email || 'Usuário Ritmika',
                email: authData?.user?.email || '',
                role: authData?.user?.user_metadata?.role || 'operator',
            });
        } catch (error) {
            logger.error({
                fn: 'AuthContext.loadUserProfile',
                status: 'error',
                userId,
                error: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setLoading(false);
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

            await loadUserProfile(data.user.id);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
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
        <AuthContext.Provider value={{ user, login, logout, signup, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
