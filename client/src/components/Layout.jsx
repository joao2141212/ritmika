import { createElement, useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    CheckSquare,
    Users,
    Settings,
    Bell,
    Bot,
    BookOpen,
    HelpCircle,
    Lightbulb,
    LogOut,
    Menu,
    Newspaper,
    ShieldCheck,
    X,
    Zap
} from 'lucide-react';
import '../styles/layout.css';
import { usePlatformAdmin } from '../hooks/usePlatformAdmin';

const SidebarItem = ({ to, icon, label, active }) => (
    <Link to={to} className={`sidebar-item ${active ? 'active' : ''}`}>
        <div className="icon-wrapper">
            {createElement(icon, { size: 20 })}
        </div>
        <span className="label">{label}</span>
        {active && <div className="active-indicator" />}
    </Link>
);

const Layout = () => {
    const { user, logout } = useAuth();
    const { isPlatformAdmin } = usePlatformAdmin();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => (
        typeof window === 'undefined' ? true : window.innerWidth > 760
    ));

    useEffect(() => {
        if (!isSidebarOpen) return undefined;
        const closeOnEscape = (event) => {
            if (event.key === 'Escape' && window.innerWidth <= 760) setIsSidebarOpen(false);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isSidebarOpen]);

    return (
        <div className="app-layout">
            <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
            <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`} aria-label="Navegação principal">
                <div className="sidebar-header">
                    <div className="logo-container">
                        <div className="logo-icon"><Zap size={24} fill="white" /></div>
                        {isSidebarOpen && <span className="logo-text">Ritmika</span>}
                    </div>
                    <button className="toggle-btn" aria-label={isSidebarOpen ? 'Recolher menu' : 'Expandir menu'} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                <nav
                    className="sidebar-nav"
                    onClick={() => {
                        if (window.innerWidth <= 760) setIsSidebarOpen(false);
                    }}
                >
                    <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} />
                    <SidebarItem to="/checklists" icon={CheckSquare} label="Checklists" active={location.pathname.includes('/checklists')} />
                    <SidebarItem to="/team" icon={Users} label="Equipe" active={location.pathname === '/team'} />
                    <SidebarItem to="/notifications" icon={Bell} label="Notificações" active={location.pathname === '/notifications'} />
                    <SidebarItem to="/ai-evidence-analyses" icon={Bot} label="Análises IA" active={location.pathname.startsWith('/ai-evidence-analyses')} />
                    <SidebarItem to="/configurations" icon={Settings} label="Configurações" active={location.pathname === '/settings' || location.pathname === '/configurations'} />
                    <SidebarItem to="/courses" icon={BookOpen} label="Cursos" active={location.pathname.startsWith('/courses')} />
                    <SidebarItem to="/help" icon={HelpCircle} label="Ajuda" active={location.pathname === '/help'} />
                    <SidebarItem to="/ideas" icon={Lightbulb} label="Ideias" active={location.pathname === '/ideas'} />
                    {isPlatformAdmin && <SidebarItem to="/platform/ideas" icon={ShieldCheck} label="Central master" active={location.pathname === '/platform/ideas'} />}
                    <SidebarItem to="/news" icon={Newspaper} label="Novidades" active={location.pathname === '/news'} />
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
                    <button onClick={logout} className="logout-btn" aria-label="Sair do Ritmika">
                        <LogOut size={20} />
                    </button>
                </div>
            </aside>

            {isSidebarOpen && (
                <button
                    type="button"
                    className="sidebar-backdrop"
                    aria-label="Fechar menu"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <main id="main-content" className="main-content" tabIndex="-1">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
