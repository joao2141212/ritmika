import { Building2, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../components/employee/employee.css';

export default function EmployeeProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const units = Array.isArray(user?.managed_units) ? user.managed_units.length : 0;
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  return (
    <section className="employee-page" aria-labelledby="employee-profile-title">
      <header className="employee-page-header"><div><p className="employee-eyebrow">Conta operacional</p><h1 id="employee-profile-title">Meu perfil</h1><p>Identidade e permissões usadas nas suas execuções.</p></div></header>
      <article className="employee-profile-card">
        <span className="employee-profile-avatar">{String(user?.name || 'R').trim().charAt(0).toUpperCase()}</span>
        <div><h2>{user?.name || 'Funcionário Ritmika'}</h2><p>{user?.email || 'E-mail não informado'}</p></div>
      </article>
      <div className="employee-profile-grid">
        <article><UserRound /><div><small>Tipo de acesso</small><strong>Operação</strong><p>Executa apenas atividades autorizadas.</p></div></article>
        <article><Building2 /><div><small>Unidades vinculadas</small><strong>{units || 'Conforme atribuição'}</strong><p>O gestor controla seu escopo operacional.</p></div></article>
        <article><ShieldCheck /><div><small>Proteção</small><strong>Permissões ativas</strong><p>Dados de gestão não ficam disponíveis nesta área.</p></div></article>
      </div>
      <button className="employee-danger-button" type="button" onClick={handleLogout}><LogOut />Sair da conta</button>
    </section>
  );
}
