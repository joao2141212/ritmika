import { Suspense, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, History, Home, LogOut, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RouteSkeleton from '../RouteSkeleton';
import './employee.css';

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const preload = () => Promise.allSettled([
      import('../../pages/employee/EmployeeHome'),
      import('../../pages/employee/EmployeeHistory'),
      import('../../pages/employee/EmployeeNotifications'),
      import('../../pages/employee/EmployeeProfile'),
      import('../ChecklistExecutionWorkspace'),
    ]);
    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timerId = window.setTimeout(preload, 120);
    return () => window.clearTimeout(timerId);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="employee-shell">
      <header className="employee-topbar">
        <a className="employee-brand" href="/app" aria-label="Início do aplicativo Ritmika">
          <span className="employee-brand-mark">R</span>
          <span>Ritmika</span>
        </a>

        <div className="employee-account">
          <span className="employee-account-copy">
            <strong>{user?.name || 'Minha rotina'}</strong>
            <small>App de Operação</small>
          </span>
          <button className="employee-icon-button" type="button" onClick={handleLogout} aria-label="Sair da conta">
            <LogOut size={19} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="employee-main">
        <div className="employee-context-pill">
          <Sparkles size={15} aria-hidden="true" />
          Suas atividades e rotinas
        </div>
        <Suspense fallback={<RouteSkeleton variant="operation" label="Carregando sua área de operação" />}>
          <Outlet />
        </Suspense>
      </main>

      <nav className="employee-nav" aria-label="Navegação principal do App de Operação">
        <NavLink to="/app" end><Home aria-hidden="true" /><span>Início</span></NavLink>
        <NavLink to="/app/history"><History aria-hidden="true" /><span>Histórico</span></NavLink>
        <NavLink to="/app/notifications"><Bell aria-hidden="true" /><span>Avisos</span></NavLink>
        <NavLink to="/app/profile"><UserRound aria-hidden="true" /><span>Perfil</span></NavLink>
      </nav>
    </div>
  );
}
