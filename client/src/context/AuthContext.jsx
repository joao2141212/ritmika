import { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

const isLocalData = import.meta.env.VITE_DATA_MODE !== 'remote';
const LOCAL_SESSION_KEY = 'ritmika.local.session.v1';
const LOCAL_USER = {
    id: 'local-manager',
    name: 'Gestor Local',
    email: 'demo@ritmika.local',
    role: 'admin',
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isLocalData) {
            let storedUser = null;
            try {
                storedUser = JSON.parse(window.localStorage.getItem(LOCAL_SESSION_KEY) || 'null');
            } catch {
                storedUser = null;
            }

            setUser(storedUser || LOCAL_USER);
            setLoading(false);
            return undefined;
        }

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
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            setUser(profile);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        if (isLocalData) {
            if (!email?.trim() || !password) {
                return { success: false, error: 'Informe um e-mail e uma senha para entrar no modo demo.' };
            }

            window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(LOCAL_USER));
            setUser(LOCAL_USER);
            return { success: true };
        }

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
        if (isLocalData) {
            window.localStorage.removeItem(LOCAL_SESSION_KEY);
            setUser(null);
            return;
        }

        await supabase.auth.signOut();
        setUser(null);
    };

    const signup = async (email, password, name, role = 'employee') => {
        if (isLocalData) {
            return {
                success: true,
                data: { user: { ...LOCAL_USER, name: name?.trim() || LOCAL_USER.name } },
            };
        }

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

export const useAuth = () => useContext(AuthContext);
