import { Building2, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './employee-password.css';
import '../../components/employee/employee.css';

export default function EmployeeProfile() {
  const { user, logout, changePassword } = useAuth();
  const navigate = useNavigate();
  const units = Array.isArray(user?.managed_units) ? user.managed_units.length : 0;
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' });
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };
  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordFeedback({ type: '', message: '' });
    if (password.length < 12) {
      setPasswordFeedback({ type: 'error', message: 'Use pelo menos 12 caracteres.' });
      return;
    }
    if (password !== confirmation) {
      setPasswordFeedback({ type: 'error', message: 'As senhas não coincidem.' });
      return;
    }
    setSavingPassword(true);
    const result = await changePassword(password);
    setSavingPassword(false);
    if (!result.success) {
      setPasswordFeedback({ type: 'error', message: result.error || 'Não foi possível alterar a senha.' });
      return;
    }
    setPassword('');
    setConfirmation('');
    setPasswordFeedback({ type: 'success', message: 'Senha alterada com segurança.' });
  };

  return (
    <section className="employee-page" aria-labelledby="employee-profile-title">
      <header className="employee-page-header"><div><p className="employee-eyebrow">Conta operacional</p><h1 id="employee-profile-title">Meu perfil</h1><p>Identidade e permissões usadas nas suas execuções.</p></div></header>
      <article className="employee-profile-card">
        <span className="employee-profile-avatar">{String(user?.name || 'R').trim().charAt(0).toUpperCase()}</span>
        <div><h2>{user?.name || 'Conta Ritmika'}</h2><p>{user?.email || 'E-mail não informado'}</p></div>
      </article>
      <div className="employee-profile-grid">
        <article><UserRound /><div><small>Tipo de acesso</small><strong>Operação</strong><p>Executa apenas atividades autorizadas.</p></div></article>
        <article><Building2 /><div><small>Unidades vinculadas</small><strong>{units || 'Conforme atribuição'}</strong><p>A gestão controla o escopo disponível nesta conta.</p></div></article>
        <article><ShieldCheck /><div><small>Proteção</small><strong>Permissões ativas</strong><p>Dados de gestão não ficam disponíveis nesta área.</p></div></article>
      </div>
      <form className="employee-password-card" onSubmit={handlePasswordChange}>
        <div className="employee-password-heading">
          <div>
            <h2>Alterar minha senha</h2>
            <p>Use uma senha exclusiva com pelo menos 12 caracteres.</p>
          </div>
        </div>
        <div className="employee-password-fields">
          <label>
            <span>Nova senha</span>
            <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required />
          </label>
          <label>
            <span>Confirmar nova senha</span>
            <input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} required />
          </label>
        </div>
        {passwordFeedback.message && (
          <p className={`employee-password-feedback is-${passwordFeedback.type}`} role="status">
            {passwordFeedback.message}
          </p>
        )}
        <button type="submit" className="employee-password-submit" disabled={savingPassword}>
          {savingPassword ? 'Alterando…' : 'Salvar nova senha'}
        </button>
      </form>
      <button className="employee-danger-button" type="button" onClick={handleLogout}><LogOut />Sair da conta</button>
    </section>
  );
}
