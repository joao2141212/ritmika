import { Building2, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../lib/logger';

export default function EmployeeProfile() {
  const { user, logout, changePassword } = useAuth();
  const navigate = useNavigate();
  const units = Array.isArray(user?.managed_units) ? user.managed_units.length : 0;
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' });
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutFeedback, setLogoutFeedback] = useState('');
  const handleLogout = async () => {
    if (loggingOut) return;
    setLogoutFeedback('');
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      logger.error({
        fn: 'EmployeeProfile.handleLogout',
        status: 'error',
        errorCode: error?.code || 'EMPLOYEE_LOGOUT_FAILED',
        error: error instanceof Error ? error.message : String(error),
      });
      setLogoutFeedback('Não foi possível sair agora. Tente novamente.');
    } finally {
      setLoggingOut(false);
    }
  };
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
    try {
      const result = await changePassword(password);
      if (!result.success) {
        setPasswordFeedback({ type: 'error', message: result.error || 'Não foi possível alterar a senha.' });
        return;
      }
      setPassword('');
      setConfirmation('');
      setPasswordFeedback({ type: 'success', message: 'Senha alterada com segurança.' });
    } catch (error) {
      logger.error({
        fn: 'EmployeeProfile.handlePasswordChange',
        status: 'error',
        errorCode: error?.code || 'EMPLOYEE_PASSWORD_CHANGE_FAILED',
        error: error instanceof Error ? error.message : String(error),
      });
      setPasswordFeedback({ type: 'error', message: 'Não foi possível alterar a senha.' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section className="grid w-full min-w-0 gap-6 text-operation-ink" aria-labelledby="employee-profile-title">
      <header className="flex items-end justify-between gap-4 max-[720px]:items-start">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-operation-mint-dark">Conta operacional</p>
          <h1 id="employee-profile-title" className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">Meu perfil</h1>
          <p className="mt-1 max-w-full text-xs text-operation-muted sm:text-sm">Identidade e permissões usadas nas suas execuções.</p>
        </div>
      </header>

      <article className="flex w-full min-w-0 items-center gap-4 rounded-2xl border border-operation-line bg-white p-5 max-[720px]:p-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(145deg,#13aa94,#087468)] text-xl font-extrabold text-white">{String(user?.name || 'R').trim().charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 max-w-full [overflow-wrap:anywhere] text-lg font-bold sm:text-xl">{user?.name || 'Conta Ritmika'}</h2>
          <p className="mt-0.5 max-w-full [overflow-wrap:anywhere] text-xs text-operation-muted">{user?.email || 'E-mail não informado'}</p>
        </div>
      </article>

      <div className="grid min-w-0 grid-cols-3 gap-3 max-[720px]:grid-cols-1">
        <article className="flex min-w-0 items-start gap-3 rounded-2xl border border-operation-line bg-white p-4">
          <UserRound className="shrink-0 text-operation-mint" size={20} aria-hidden="true" />
          <div className="grid min-w-0">
            <small className="text-xs text-operation-muted">Tipo de acesso</small>
            <strong className="mt-0.5 text-sm font-bold">Operação</strong>
            <p className="mt-1 max-w-full text-xs leading-relaxed text-operation-muted">Executa apenas atividades autorizadas.</p>
          </div>
        </article>
        <article className="flex min-w-0 items-start gap-3 rounded-2xl border border-operation-line bg-white p-4">
          <Building2 className="shrink-0 text-operation-mint" size={20} aria-hidden="true" />
          <div className="grid min-w-0">
            <small className="text-xs text-operation-muted">Unidades vinculadas</small>
            <strong className="mt-0.5 text-sm font-bold">{units || 'Conforme atribuição'}</strong>
            <p className="mt-1 max-w-full text-xs leading-relaxed text-operation-muted">A gestão controla o escopo disponível nesta conta.</p>
          </div>
        </article>
        <article className="flex min-w-0 items-start gap-3 rounded-2xl border border-operation-line bg-white p-4">
          <ShieldCheck className="shrink-0 text-operation-mint" size={20} aria-hidden="true" />
          <div className="grid min-w-0">
            <small className="text-xs text-operation-muted">Proteção</small>
            <strong className="mt-0.5 text-sm font-bold">Permissões ativas</strong>
            <p className="mt-1 max-w-full text-xs leading-relaxed text-operation-muted">Dados de gestão não ficam disponíveis nesta área.</p>
          </div>
        </article>
      </div>

      <form className="grid gap-4 rounded-2xl border border-[#dbe5e7] bg-white p-5 shadow-sm sm:p-6" onSubmit={handlePasswordChange}>
        <div>
          <h2 className="m-0 text-lg font-bold tracking-tight">Alterar minha senha</h2>
          <p className="mt-1 text-xs text-operation-muted">Use uma senha exclusiva com pelo menos 12 caracteres.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
          <label className="grid gap-1.5 text-xs font-bold text-[#40565e]">
            <span>Nova senha</span>
            <input className="min-h-[44px] rounded-xl border border-[#cfdee2] px-3.5 text-sm text-operation-ink outline-none transition-colors focus:border-operation-mint focus:ring-2 focus:ring-operation-mint/15" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-[#40565e]">
            <span>Confirmar nova senha</span>
            <input className="min-h-[44px] rounded-xl border border-[#cfdee2] px-3.5 text-sm text-operation-ink outline-none transition-colors focus:border-operation-mint focus:ring-2 focus:ring-operation-mint/15" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} required />
          </label>
        </div>
        {passwordFeedback.message && (
          <p className={`m-0 rounded-xl px-3 py-2 text-xs font-bold ${passwordFeedback.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700'}`} role="status">
            {passwordFeedback.message}
          </p>
        )}
        <button type="submit" className="min-h-11 rounded-xl border-0 bg-operation-mint-dark text-xs font-bold text-white transition-colors hover:bg-operation-mint disabled:opacity-60" disabled={savingPassword}>
          {savingPassword ? 'Alterando…' : 'Salvar nova senha'}
        </button>
      </form>
      {logoutFeedback && <p className="m-0 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700" role="alert">{logoutFeedback}</p>}
      <button className="inline-flex min-h-11 shrink-0 items-center gap-2 justify-self-start rounded-xl border border-red-200 bg-red-50/50 px-4 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60" type="button" onClick={handleLogout} disabled={loggingOut}><LogOut size={16} aria-hidden="true" />{loggingOut ? 'Saindo…' : 'Sair da conta'}</button>
    </section>
  );
}
