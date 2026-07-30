import { useState } from 'react';
import { Building2, Check, LoaderCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logger } from '../lib/logger';

const roleLabels = {
    owner: 'Proprietário',
    admin: 'Administrador',
    manager: 'Gestor',
    operator: 'Operador',
    viewer: 'Leitura',
};

const WorkspaceSelection = () => {
    const { workspaceSelection, selectWorkspace, logout } = useAuth();
    const [submittingId, setSubmittingId] = useState('');
    const [error, setError] = useState('');
    const [loggingOut, setLoggingOut] = useState(false);

    const handleSelect = async (workspaceId) => {
        setSubmittingId(workspaceId);
        setError('');
        try {
            const result = await selectWorkspace(workspaceId);
            if (!result?.success) {
                setError(result?.error || 'Não foi possível abrir esta empresa.');
            }
        } catch (selectionError) {
            logger.error({
                file: 'client/src/pages/WorkspaceSelection.jsx',
                function: 'WorkspaceSelection.handleSelect',
                operation: 'workspace.select',
                errorCode: 'WORKSPACE_SELECTION_FAILED',
                workspaceId,
                error: selectionError,
            });
            setError('Não foi possível abrir esta empresa. Tente novamente.');
        } finally {
            setSubmittingId('');
        }
    };

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        setError('');
        try {
            await logout();
        } catch (logoutError) {
            logger.error({
                file: 'client/src/pages/WorkspaceSelection.jsx',
                function: 'WorkspaceSelection.handleLogout',
                operation: 'auth.logout',
                errorCode: 'WORKSPACE_LOGOUT_FAILED',
                error: logoutError,
            });
            setError('Não foi possível sair agora. Tente novamente.');
        } finally {
            setLoggingOut(false);
        }
    };

    return (
        <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,rgba(18,145,132,0.13),transparent_34%),#f3f7f8] px-5 py-8 text-[#17303a] max-[520px]:items-start max-[520px]:px-3 max-[520px]:py-[18px]">
            <section className="w-full max-w-[620px] rounded-[28px] border border-[#d9e4e7] bg-white/[0.96] p-[clamp(28px,5vw,48px)] shadow-[0_24px_70px_rgba(23,48,58,0.12)] max-[520px]:rounded-[22px] max-[520px]:px-5 max-[520px]:py-[26px]" aria-labelledby="workspace-selection-title">
                <div className="grid h-[52px] w-[52px] place-items-center rounded-2xl bg-[#dff5f1] text-[#087d72]"><Building2 size={24} aria-hidden="true" /></div>
                <p className="mt-6 mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#087d72]">Empresa ativa</p>
                <h1 id="workspace-selection-title" className="m-0 text-[clamp(1.75rem,4vw,2.35rem)] font-extrabold leading-[1.12]">Onde você quer trabalhar agora?</h1>
                <p className="mt-3 mb-7 text-[#667b84] leading-[1.6]">
                    Seus dados, permissões e unidades mudam conforme a empresa escolhida.
                </p>

                <div className="grid gap-3">
                    {(workspaceSelection?.options || []).map((option) => {
                        const workspace = option.workspace || {};
                        const isSubmitting = submittingId === option.workspace_id;
                        return (
                            <button
                                key={option.workspace_id}
                                type="button"
                                className="group grid min-h-[82px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-[18px] border border-[#d8e3e7] bg-white p-4 text-left text-inherit transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-[#16a393] hover:shadow-[0_10px_26px_rgba(8,125,114,0.12)] focus-visible:-translate-y-px focus-visible:border-[#16a393] focus-visible:outline-[3px] focus-visible:outline-[#16a393]/25 focus-visible:outline-offset-1 disabled:cursor-wait disabled:opacity-[0.72]"
                                disabled={Boolean(submittingId)}
                                onClick={() => handleSelect(option.workspace_id)}
                            >
                                <span className="grid h-[42px] w-[42px] place-items-center rounded-[13px] bg-[#edf8f6] text-[#087d72]"><Building2 size={20} aria-hidden="true" /></span>
                                <span className="grid min-w-0 gap-1">
                                    <strong className="overflow-hidden text-ellipsis whitespace-nowrap">{workspace.name || 'Empresa sem nome'}</strong>
                                    <small className="text-[#71848c]">{roleLabels[String(option.role || '').toLowerCase()] || option.role || 'Membro'}</small>
                                </span>
                                <span className="grid place-items-center text-[#087d72]">
                                    {isSubmitting ? <LoaderCircle size={19} className="animate-spin [animation-duration:800ms]" aria-hidden="true" /> : <Check size={19} aria-hidden="true" />}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {error ? <p className="mt-4 rounded-xl bg-[#fff0f0] px-3.5 py-3 text-[#9f2f2f]" role="alert">{error}</p> : null}

                <button type="button" className="mx-auto mt-[26px] inline-flex items-center gap-2 border-0 bg-transparent text-[#5f737c] transition-colors hover:text-[#17303a] hover:underline focus-visible:text-[#17303a] focus-visible:outline-[3px] focus-visible:outline-[#17303a]/20 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60" onClick={handleLogout} disabled={loggingOut || Boolean(submittingId)} aria-busy={loggingOut}>
                    <LogOut size={16} aria-hidden="true" /> {loggingOut ? 'Saindo…' : 'Entrar com outra conta'}
                </button>
            </section>
        </main>
    );
};

export default WorkspaceSelection;
