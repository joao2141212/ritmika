import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    CheckSquare,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    Zap
} from 'lucide-react';
import '../styles/layout.css';

const SidebarItem = ({ to, icon: Icon, label, active }) => (
    <Link to={to} className={`sidebar-item ${active ? 'active' : ''}`}>
        <div className="icon-wrapper">
            <Icon size={20} />
        </div>
        <span className="label">{label}</span>
        {active && <motion.div layoutId="active-pill" className="active-indicator" />}
    </Link>
);

const Layout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="app-layout">
            <motion.aside
                className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}
                animate={{ width: isSidebarOpen ? 280 : 80 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <div className="sidebar-header">
                    <div className="logo-container">
                        <div className="logo-icon"><Zap size={24} fill="white" /></div>
                        <AnimatePresence>
                            {isSidebarOpen && (
                                <motion.span
                                    className="logo-text"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    Ritmika
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                    <button className="toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <SidebarItem to="/" icon={LayoutDashboard} label="Visão Geral" active={location.pathname === '/'} />
                    <SidebarItem to="/checklists" icon={CheckSquare} label="Checklists" active={location.pathname.includes('/checklists')} />
                    <SidebarItem to="/team" icon={Users} label="Equipe" active={location.pathname === '/team'} />
                    <SidebarItem to="/settings" icon={Settings} label="Configurações" active={location.pathname === '/settings'} />
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="avatar">{user?.name?.charAt(0)}</div>
                        {isSidebarOpen && (
                            <div className="user-info">
                                <span className="name">{user?.name}</span>
                                <span className="role">{user?.role} • {user?.points || 0} pts</span>
                            </div>
                        )}
                    </div>
                    <button onClick={logout} className="logout-btn">
                        <LogOut size={20} />
                    </button>
                </div>
            </motion.aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
