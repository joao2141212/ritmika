import { Suspense, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Bell, ClipboardList, History, Home, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RouteSkeleton from '../RouteSkeleton';
import './employee.css';
import './employee-navigation.css';

export default function EmployeeLayout() {
  const { user } = useAuth();

  useEffect(() => {
    const preload = () => Promise.allSettled([
      import('../../pages/employee/EmployeeHome'),
      import('../../pages/employee/EmployeeActivities'),
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

  return (
    <div className="employee-shell">
      <header className="employee-topbar">
        <a className="employee-brand" href="/app" aria-label="Início do aplicativo Ritmika">
          <span className="employee-brand-mark">R</span>
          <span>Ritmika</span>
        </a>

        <NavLink className="employee-profile-shortcut" to="/app/profile" aria-label="Abrir meu perfil">
          <span className="employee-profile-shortcut-copy">
            <strong>{user?.name || 'Minha rotina'}</strong>
            <small>Meu perfil</small>
          </span>
          <span className="employee-profile-shortcut-avatar" aria-hidden="true">
            {String(user?.name || 'R').trim().charAt(0).toUpperCase()}
          </span>
        </NavLink>
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
        <NavLink to="/app/activities"><ClipboardList aria-hidden="true" /><span>Atividades</span></NavLink>
        <NavLink to="/app/history"><History aria-hidden="true" /><span>Histórico</span></NavLink>
        <NavLink to="/app/notifications"><Bell aria-hidden="true" /><span>Avisos</span></NavLink>
      </nav>
    </div>
  );
}
