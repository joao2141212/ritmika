import { createElement, Suspense, useEffect, useState } from 'react';
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
import { usePlatformAdmin } from '../hooks/usePlatformAdmin';
import RouteSkeleton from './RouteSkeleton';

const SidebarItem = ({ to, icon, label, active, collapsed }) => (
    <Link
        to={to}
        className={`relative flex items-center gap-4 rounded-xl px-4 py-3.5 text-workspace-muted no-underline transition-colors duration-200 hover:bg-workspace-accent-soft hover:text-workspace-accent-strong ${active ? 'bg-workspace-accent-soft text-workspace-accent-strong' : ''} ${collapsed ? 'justify-center px-2.5' : ''}`}
    >
        <div className="flex items-center justify-center">
            {createElement(icon, { size: 20 })}
        </div>
        <span className={`${collapsed ? 'hidden' : ''} whitespace-nowrap text-sm font-medium`}>{label}</span>
        {active && <div className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-md bg-workspace-accent" />}
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
        <div className="relative flex h-screen overflow-hidden bg-workspace max-[760px]:block max-[760px]:h-dvh">
            <a
                className="fixed left-3 top-3 z-[100] -translate-y-[160%] rounded-[9px] bg-workspace-ink px-3.5 py-2.5 font-semibold text-white no-underline transition-transform duration-150 ease-out focus:translate-y-0 focus:outline-3 focus:outline-workspace-accent/30 focus:outline-offset-3"
                href="#main-content"
            >
                Pular para o conteúdo
            </a>
            <aside
                className={`z-[70] flex h-full shrink-0 flex-col border-r border-workspace-border bg-white shadow-[8px_0_24px_rgba(24,48,64,0.04)] transition-[width] duration-200 ease-in-out max-[760px]:fixed max-[760px]:inset-x-0 max-[760px]:top-0 max-[760px]:block max-[760px]:h-16 max-[760px]:w-full max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:shadow-[0_8px_24px_rgba(24,48,64,0.06)] ${isSidebarOpen ? 'w-[280px] max-[760px]:inset-0 max-[760px]:z-[80] max-[760px]:flex max-[760px]:h-dvh max-[760px]:w-[min(280px,calc(100vw-32px))] max-[760px]:shadow-[14px_0_30px_rgba(24,48,64,0.16)]' : 'w-24'}`}
                    aria-label="Navegação principal"
                >
                <div className={`flex h-20 items-center justify-between border-b border-workspace-border-soft px-6 ${!isSidebarOpen ? 'max-[760px]:h-16 max-[760px]:px-4' : ''}`}>
                    <div className={`flex items-center gap-3 ${!isSidebarOpen ? 'max-[760px]:flex-1' : ''}`}>
                        <img
                            src="/ritmika-mark-square-final.png"
                            alt="Ritmika"
                            className="size-9 rounded-[10px] object-cover"
                            fetchPriority="high"
                        />
                        {isSidebarOpen ? (
                            <span className="text-xl font-bold tracking-[-0.5px] text-workspace-ink">Ritmika</span>
                        ) : (
                            <span className="hidden text-base font-extrabold text-workspace-ink max-[760px]:inline">Ritmika</span>
                        )}
                    </div>
                    <button className="rounded-lg border-0 bg-transparent p-2 text-workspace-muted transition-colors hover:bg-workspace-accent-soft hover:text-workspace-accent-strong" type="button" aria-label={isSidebarOpen ? 'Recolher menu' : 'Expandir menu'} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                <nav
                    className={`flex flex-1 flex-col gap-2 px-4 py-6 ${!isSidebarOpen ? 'max-[760px]:hidden' : ''}`}
                    onClick={() => {
                        if (window.innerWidth <= 760) setIsSidebarOpen(false);
                    }}
                >
                    <SidebarItem collapsed={!isSidebarOpen} to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} />
                    <SidebarItem collapsed={!isSidebarOpen} to="/checklists" icon={CheckSquare} label="Checklists" active={location.pathname.includes('/checklists')} />
                    <SidebarItem collapsed={!isSidebarOpen} to="/team" icon={Users} label="Equipe" active={location.pathname === '/team'} />
                    <SidebarItem collapsed={!isSidebarOpen} to="/notifications" icon={Bell} label="Notificações" active={location.pathname === '/notifications'} />
                    <SidebarItem collapsed={!isSidebarOpen} to="/ai-evidence-analyses" icon={Bot} label="Análises IA" active={location.pathname.startsWith('/ai-evidence-analyses')} />
                    <SidebarItem collapsed={!isSidebarOpen} to="/configurations" icon={Settings} label="Configurações" active={location.pathname === '/settings' || location.pathname === '/configurations'} />
                    <SidebarItem collapsed={!isSidebarOpen} to="/courses" icon={BookOpen} label="Cursos" active={location.pathname.startsWith('/courses')} />
                    <SidebarItem collapsed={!isSidebarOpen} to="/help" icon={HelpCircle} label="Ajuda" active={location.pathname === '/help'} />
                    <SidebarItem collapsed={!isSidebarOpen} to="/ideas" icon={Lightbulb} label="Ideias" active={location.pathname === '/ideas'} />
                    {isPlatformAdmin && <SidebarItem collapsed={!isSidebarOpen} to="/platform/ideas" icon={ShieldCheck} label="Central master" active={location.pathname === '/platform/ideas'} />}
                    <SidebarItem collapsed={!isSidebarOpen} to="/news" icon={Newspaper} label="Novidades" active={location.pathname === '/news'} />
                </nav>

                <div className={`flex items-center justify-between border-t border-workspace-border-soft py-6 ${isSidebarOpen ? 'px-6' : 'px-3 max-[760px]:hidden'}`}>
                    <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                        <div className="flex size-10 items-center justify-center rounded-xl border border-workspace-avatar-border bg-workspace-avatar font-semibold text-workspace-accent-strong">{user?.name?.charAt(0)}</div>
                        {isSidebarOpen && (
                            <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
                                <span className="truncate text-sm font-semibold text-workspace-ink">{user?.name}</span>
                                <span className="whitespace-nowrap text-xs text-workspace-muted">{user?.role} • {user?.points || 0} pts</span>
                            </div>
                        )}
                    </div>
                    <button onClick={logout} className="rounded-lg border-0 bg-transparent p-2 text-workspace-muted transition-colors hover:bg-workspace-accent-soft hover:text-workspace-accent-strong" type="button" aria-label="Sair do Ritmika">
                        <LogOut size={20} />
                    </button>
                </div>
            </aside>

            {isSidebarOpen && (
                <button
                    type="button"
                    className="hidden max-[760px]:fixed max-[760px]:inset-0 max-[760px]:z-[75] max-[760px]:block max-[760px]:border-0 max-[760px]:bg-[rgba(20,33,43,0.38)] max-[760px]:backdrop-blur-[2px]"
                    aria-label="Fechar menu"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <main id="main-content" className="relative min-w-0 flex-1 overflow-y-auto bg-workspace max-[760px]:h-dvh max-[760px]:w-full max-[760px]:pt-16" tabIndex="-1">
                <Suspense fallback={<RouteSkeleton variant="manager" label="Carregando área de gestão" />}>
                    <Outlet />
                </Suspense>
            </main>
        </div>
    );
};

export default Layout;
