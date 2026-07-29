import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './employee.css';

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
            <small>Área operacional</small>
          </span>
          <button className="employee-icon-button" type="button" onClick={handleLogout} aria-label="Sair da conta">
            <LogOut size={19} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="employee-main">
        <div className="employee-context-pill">
          <Sparkles size={15} aria-hidden="true" />
          Somente atividades atribuídas a você
        </div>
        <Outlet />
      </main>
    </div>
  );
}
