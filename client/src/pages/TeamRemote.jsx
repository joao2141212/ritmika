import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ChevronRight, KeyRound, LoaderCircle, RefreshCw, Search, ShieldCheck, Sparkles, UserCog, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamService } from '../services/checklistProducaoService';

const ROLE_LABELS = {
    owner: 'Proprietário',
    admin: 'Administrador',
    manager: 'Gestor',
    operator: 'Operador',
    employee: 'Colaborador',
    viewer: 'Leitura',
};

const safePercent = (value) => Math.max(0, Math.min(100, Number(value) || 0));

const TeamRemote = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [role, setRole] = useState('all');

    const filteredUsers = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        return users.filter((member) => {
            const memberRole = String(member.role || 'operator').toLocaleLowerCase();
            const searchable = [member.name, member.email, memberRole]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase();
            return (role === 'all' || memberRole === role)
                && (!normalizedQuery || searchable.includes(normalizedQuery));
        });
    }, [query, role, users]);

    const summary = useMemo(() => {
        const total = users.length;
        const accessEnabled = users.filter((member) => member.auth_user_id).length;
        const managers = users.filter((member) => member.is_owner || ['owner', 'admin', 'manager'].includes(String(member.role || '').toLocaleLowerCase())).length;
        const averageCompletion = total
            ? Math.round(users.reduce((sum, member) => sum + safePercent(member.completion_rate), 0) / total)
            : 0;
        return { total, accessEnabled, managers, averageCompletion };
    }, [users]);

    const loadTeam = async () => {
        try {
            setLoading(true);
            setError('');
            setUsers(await teamService.getAll());
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a equipe.');
            toast.error('Não foi possível carregar a equipe.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // The loader owns async state synchronization for this route.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadTeam();
    }, []);

    return (
        <div className="min-h-full bg-[#f7f9fc] px-5 pb-12 pt-8 text-[#14212b] sm:px-8 lg:px-14">
            <header className="mb-6 flex items-start justify-between gap-6 max-[760px]:flex-col">
                <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.13em] text-[#087d70]">Pessoas e acessos</p>
                    <h1 className="m-0 text-[clamp(28px,3vw,40px)] font-extrabold tracking-[-0.03em]">Equipe</h1>
                    <p className="mt-2 text-sm text-[#71808c]">Veja quem opera o workspace, acompanhe desempenho e abra a manutenção de acesso no mesmo fluxo.</p>
                </div>
                <div className="flex flex-wrap gap-2 max-[760px]:w-full max-[760px]:flex-col">
                    <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[#dbe4ea] bg-white px-3 text-xs font-bold text-[#38515f] transition-colors hover:border-[#9bcfc7] hover:text-[#087d70] disabled:cursor-wait disabled:opacity-60 max-[760px]:w-full" onClick={loadTeam} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                    <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] bg-[#087d70] px-3 text-xs font-bold text-white transition-colors hover:bg-[#06675d] max-[760px]:w-full" onClick={() => navigate('/configurations?tab=users')}>
                        <UserCog size={17} />
                        Gerenciar acessos
                    </button>
                </div>
            </header>

            <section className="mb-6 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2" aria-label="Resumo da equipe">
                <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#e0e7ec] bg-white p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8f7f4] text-[#087d70]"><Users size={19} /></span><div className="min-w-0"><strong className="block text-2xl font-extrabold">{summary.total}</strong><span className="text-xs text-[#71808c]">perfis no workspace</span></div></article>
                <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#e0e7ec] bg-white p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf4ff] text-[#3867a8]"><KeyRound size={19} /></span><div className="min-w-0"><strong className="block text-2xl font-extrabold">{summary.accessEnabled}</strong><span className="text-xs text-[#71808c]">com acesso ao app</span></div></article>
                <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#e0e7ec] bg-white p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f2edff] text-[#7051b5]"><ShieldCheck size={19} /></span><div className="min-w-0"><strong className="block text-2xl font-extrabold">{summary.managers}</strong><span className="text-xs text-[#71808c]">gestores e admins</span></div></article>
                <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#e0e7ec] bg-white p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff5df] text-[#b7791f]"><Activity size={19} /></span><div className="min-w-0"><strong className="block text-2xl font-extrabold">{summary.averageCompletion}%</strong><span className="text-xs text-[#71808c]">conclusão média</span></div></article>
            </section>

            <section className="rounded-2xl border border-[#e0e7ec] bg-white p-5 shadow-[0_12px_36px_rgba(20,33,43,0.05)] sm:p-6">
                <div className="mb-5 flex items-end justify-between gap-5 max-[760px]:flex-col max-[760px]:items-stretch">
                    <div>
                        <h2 className="m-0 text-xl font-extrabold">Colaboradores</h2>
                        <p className="mt-1 text-sm text-[#71808c]">{filteredUsers.length} de {users.length} perfis exibidos</p>
                    </div>
                    <div className="flex gap-2 max-[760px]:flex-col">
                        <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-[#dbe4ea] px-3 text-[#71808c] focus-within:border-[#087d70]">
                            <Search size={17} />
                            <span className="sr-only">Buscar colaborador</span>
                            <input className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#14212b] outline-none placeholder:text-[#9aa7af]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou e-mail" />
                        </label>
                        <label className="flex min-h-10 items-center rounded-[10px] border border-[#dbe4ea] px-3 max-[760px]:w-full">
                            <span className="sr-only">Filtrar por papel</span>
                            <select className="w-full border-0 bg-transparent text-sm text-[#38515f] outline-none" value={role} onChange={(event) => setRole(event.target.value)}>
                                <option value="all">Todos os papéis</option>
                                <option value="admin">Administradores</option>
                                <option value="manager">Gestores</option>
                                <option value="operator">Operadores</option>
                                <option value="viewer">Leitura</option>
                            </select>
                        </label>
                    </div>
                </div>

                {loading ? (
                    <div className="flex min-h-64 items-center justify-center gap-2 text-[#71808c]"><LoaderCircle size={22} className="animate-spin" /> Carregando equipe…</div>
                ) : error ? (
                    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-[#c44949]"><span>{error}</span><button className="inline-flex min-h-10 items-center rounded-[10px] border border-[#dbe4ea] bg-white px-3 text-xs font-bold text-[#38515f]" type="button" onClick={loadTeam}>Tentar novamente</button></div>
                ) : users.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center text-[#71808c]"><Users size={28} /><h3 className="m-0 text-lg font-extrabold text-[#14212b]">Nenhum perfil encontrado</h3><p className="m-0">Convide a primeira pessoa pela manutenção de usuários.</p><button className="mt-2 inline-flex min-h-10 items-center rounded-[10px] bg-[#087d70] px-3 text-xs font-bold text-white" type="button" onClick={() => navigate('/configurations?tab=users')}>Abrir usuários</button></div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center text-[#71808c]"><Search size={27} /><h3 className="m-0 text-lg font-extrabold text-[#14212b]">Nenhum resultado</h3><p className="m-0">Remova os filtros ou tente outro termo.</p><button className="mt-2 inline-flex min-h-10 items-center rounded-[10px] border border-[#dbe4ea] bg-white px-3 text-xs font-bold text-[#38515f]" type="button" onClick={() => { setQuery(''); setRole('all'); }}>Limpar filtros</button></div>
                ) : (
                    <div className="grid grid-cols-3 gap-4 max-[1100px]:grid-cols-2 max-[760px]:grid-cols-1">
                        {filteredUsers.map((member, index) => {
                            const completion = safePercent(member.completion_rate);
                            const score = safePercent(member.average_score);
                            const roleKey = String(member.role || 'operator').toLocaleLowerCase();
                            return (
                                <article className="flex min-w-0 flex-col gap-4 rounded-2xl border border-[#e0e7ec] bg-white p-5 shadow-[0_8px_24px_rgba(20,33,43,0.04)]" key={member.id}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#e8f7f4] font-extrabold text-[#087d70]">{member.name?.charAt(0)?.toUpperCase() || '?'}</span>
                                            <div className="min-w-0"><strong className="block truncate text-sm font-extrabold">{member.name || 'Sem nome'}</strong><span className="block truncate text-xs text-[#71808c]">{member.email || 'Sem e-mail de acesso'}</span></div>
                                        </div>
                                        {index === 0 && member.completed_count > 0 ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#fff5df] px-2 py-1 text-[11px] font-bold text-[#b7791f]"><Sparkles size={13} /> Destaque</span> : null}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${roleKey === 'owner' || roleKey === 'admin' ? 'bg-[#f2edff] text-[#7051b5]' : roleKey === 'manager' ? 'bg-[#edf4ff] text-[#3867a8]' : 'bg-[#e8f7f4] text-[#087d70]'}`}>{ROLE_LABELS[roleKey] || member.role || 'Operador'}</span>
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${member.auth_user_id ? 'bg-[#e8f7f4] text-[#087d70]' : 'bg-[#fff5df] text-[#b7791f]'}`}>{member.auth_user_id ? 'Acesso ativo' : 'Perfil sem login'}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><span className="block text-xs text-[#71808c]">Execuções</span><strong className="block text-xl font-extrabold">{member.execution_count || 0}</strong><small className="text-[11px] text-[#71808c]">{member.completed_count || 0} concluídas</small></div>
                                        <div><span className="block text-xs text-[#71808c]">Score médio</span><strong className="block text-xl font-extrabold">{Math.round(score)}%</strong><small className="text-[11px] text-[#71808c]">qualidade operacional</small></div>
                                    </div>
                                    <div>
                                        <div className="mb-2 flex items-center justify-between text-xs text-[#71808c]"><span>Taxa de conclusão</span><strong className="text-[#14212b]">{Math.round(completion)}%</strong></div>
                                        <span className="block h-2 overflow-hidden rounded-full bg-[#e8eef1]" role="progressbar" aria-label={`Conclusão de ${member.name || 'colaborador'}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(completion)}><span className="block h-full rounded-full bg-[#087d70] transition-[width] duration-300" style={{ width: `${completion}%` }} /></span>
                                    </div>
                                    <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[#dbe4ea] bg-white px-3 text-xs font-bold text-[#38515f] transition-colors hover:border-[#9bcfc7] hover:text-[#087d70]" onClick={() => navigate(`/configurations?tab=users&user=${encodeURIComponent(member.id)}`)}>
                                        Revisar perfil e acesso <ChevronRight size={16} />
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};

export default TeamRemote;
