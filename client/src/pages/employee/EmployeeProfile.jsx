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
    <section className="grid w-full min-w-0 gap-[22px] text-operation-ink max-[360px]:gap-4" aria-labelledby="employee-profile-title">
      <header className="flex items-end justify-between gap-5 max-[720px]:items-start">
        <div className="min-w-0">
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.13em] text-operation-mint-dark">Conta operacional</p>
          <h1 id="employee-profile-title" className="m-0 text-[clamp(32px,5vw,48px)] font-extrabold tracking-[-0.04em] max-[360px]:text-[34px]">Meu perfil</h1>
          <p className="mt-2 max-w-full text-operation-muted">Identidade e permissões usadas nas suas execuções.</p>
        </div>
      </header>

      <article className="flex w-full min-w-0 items-center gap-[18px] rounded-3xl border border-operation-line bg-white p-6 max-[720px]:gap-4 max-[720px]:rounded-[22px] max-[720px]:p-5 max-[360px]:gap-3 max-[360px]:rounded-[20px] max-[360px]:p-4">
        <span className="grid h-[72px] w-[72px] flex-[0_0_72px] place-items-center rounded-3xl bg-[linear-gradient(145deg,#13aa94,#087468)] text-[28px] font-extrabold text-white max-[720px]:h-16 max-[720px]:w-16 max-[720px]:flex-[0_0_64px] max-[720px]:rounded-[20px] max-[360px]:h-[52px] max-[360px]:w-[52px] max-[360px]:flex-[0_0_52px] max-[360px]:rounded-[17px] max-[360px]:text-[21px]">{String(user?.name || 'R').trim().charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 max-w-full [overflow-wrap:anywhere] text-2xl font-extrabold max-[720px]:text-[22px] max-[360px]:text-xl">{user?.name || 'Conta Ritmika'}</h2>
          <p className="mt-1 max-w-full [overflow-wrap:anywhere] text-operation-muted">{user?.email || 'E-mail não informado'}</p>
        </div>
      </article>

      <div className="grid min-w-0 grid-cols-3 gap-3 max-[720px]:grid-cols-1">
        <article className="flex min-w-0 items-start gap-3.5 rounded-[20px] border border-operation-line bg-white p-5 max-[360px]:rounded-[18px] max-[360px]:p-4">
          <UserRound className="shrink-0 text-operation-mint" aria-hidden="true" />
          <div className="grid min-w-0">
            <small className="text-operation-muted">Tipo de acesso</small>
            <strong className="mt-1 max-w-full [overflow-wrap:anywhere]">Operação</strong>
            <p className="mt-1.5 max-w-full [overflow-wrap:anywhere] text-[13px] leading-[1.45] text-operation-muted">Executa apenas atividades autorizadas.</p>
          </div>
        </article>
        <article className="flex min-w-0 items-start gap-3.5 rounded-[20px] border border-operation-line bg-white p-5 max-[360px]:rounded-[18px] max-[360px]:p-4">
          <Building2 className="shrink-0 text-operation-mint" aria-hidden="true" />
          <div className="grid min-w-0">
            <small className="text-operation-muted">Unidades vinculadas</small>
            <strong className="mt-1 max-w-full [overflow-wrap:anywhere]">{units || 'Conforme atribuição'}</strong>
            <p className="mt-1.5 max-w-full [overflow-wrap:anywhere] text-[13px] leading-[1.45] text-operation-muted">A gestão controla o escopo disponível nesta conta.</p>
          </div>
        </article>
        <article className="flex min-w-0 items-start gap-3.5 rounded-[20px] border border-operation-line bg-white p-5 max-[360px]:rounded-[18px] max-[360px]:p-4">
          <ShieldCheck className="shrink-0 text-operation-mint" aria-hidden="true" />
          <div className="grid min-w-0">
            <small className="text-operation-muted">Proteção</small>
            <strong className="mt-1 max-w-full [overflow-wrap:anywhere]">Permissões ativas</strong>
            <p className="mt-1.5 max-w-full [overflow-wrap:anywhere] text-[13px] leading-[1.45] text-operation-muted">Dados de gestão não ficam disponíveis nesta área.</p>
          </div>
        </article>
      </div>

      <form className="grid gap-[18px] rounded-3xl border border-[#dbe5e7] bg-white p-[22px] shadow-[0_16px_40px_rgba(24,50,58,0.07)] max-[640px]:rounded-[20px] max-[640px]:p-[18px]" onSubmit={handlePasswordChange}>
        <div>
          <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.025em]">Alterar minha senha</h2>
          <p className="mt-1 text-operation-muted">Use uma senha exclusiva com pelo menos 12 caracteres.</p>
        </div>
        <div className="grid grid-cols-2 gap-3.5 max-[640px]:grid-cols-1">
          <label className="grid gap-1.5 font-bold text-[#40565e]">
            <span>Nova senha</span>
            <input className="min-h-[50px] rounded-[14px] border border-[#cfdee2] px-3.5 text-operation-ink outline-0 transition-colors focus:border-operation-mint focus:outline-[3px] focus:outline-operation-mint/15" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required />
          </label>
          <label className="grid gap-1.5 font-bold text-[#40565e]">
            <span>Confirmar nova senha</span>
            <input className="min-h-[50px] rounded-[14px] border border-[#cfdee2] px-3.5 text-operation-ink outline-0 transition-colors focus:border-operation-mint focus:outline-[3px] focus:outline-operation-mint/15" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} required />
          </label>
        </div>
        {passwordFeedback.message && (
          <p className={`m-0 rounded-xl px-[13px] py-[11px] font-bold ${passwordFeedback.type === 'error' ? 'bg-[#fff0f0] text-[#a62d2d]' : 'bg-[#e8f7f4] text-[#087064]'}`} role="status">
            {passwordFeedback.message}
          </p>
        )}
        <button type="submit" className="min-h-12 rounded-[14px] border-0 bg-[#0b8f82] font-extrabold text-white transition-colors hover:bg-operation-mint-dark focus-visible:outline-[3px] focus-visible:outline-operation-accent/25 focus-visible:outline-offset-3 disabled:cursor-wait disabled:opacity-[0.65]" disabled={savingPassword}>
          {savingPassword ? 'Alterando…' : 'Salvar nova senha'}
        </button>
      </form>
      {logoutFeedback && <p className="m-0 rounded-xl bg-[#fff0f0] px-[13px] py-[11px] font-bold text-[#a62d2d]" role="alert">{logoutFeedback}</p>}
      <button className="inline-flex min-h-[46px] shrink-0 items-center gap-2 justify-self-start rounded-[15px] border border-[#efcaca] bg-[#fffafa] px-[17px] font-extrabold text-[#a43737] transition-colors hover:bg-[#fff0f0] focus-visible:outline-[3px] focus-visible:outline-[#a43737]/25 focus-visible:outline-offset-3 disabled:cursor-wait disabled:opacity-[0.65]" type="button" onClick={handleLogout} disabled={loggingOut}><LogOut size={18} aria-hidden="true" />{loggingOut ? 'Saindo…' : 'Sair da conta'}</button>
    </section>
  );
}
