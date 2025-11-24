import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { mockUsers, simulateApiDelay } from '../data/mockData';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        // Simulate API delay
        await simulateApiDelay();

        const user = mockUsers.find(u => u.email === email && u.password === password);

        if (!user) {
            return { success: false, error: 'Credenciais inválidas' };
        }

        // Create mock JWT token
        const token = btoa(JSON.stringify({ id: user.id, role: user.role, exp: Date.now() + 86400000 }));

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role }));
        setUser({ id: user.id, name: user.name, email: user.email, role: user.role });

        return { success: true };
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
