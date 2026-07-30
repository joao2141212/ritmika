import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Archive, Building2, Check, Layers3, LoaderCircle, LogOut, Mail, Pencil, Plus, RefreshCw, Save, Search, Settings as SettingsIcon, Shield, Smartphone, User, UserPlus, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { settingsService } from '../services/checklistProducaoService';
import { matchesSearchText } from '../lib/plainText';

const DEFAULT_PREFERENCES = {
    pushNotifications: true,
    emailDigest: false,
    soundEffects: true,
};

const EMPTY_UNIT = { id: null, name: '', address: '', timezone: 'America/Sao_Paulo' };
const EMPTY_SECTOR = { id: null, name: '', system_key: '' };
const EMPTY_INVITE = { name: '', email: '', role: 'operator', managed_units: [] };
const ROLE_OPTIONS = ['owner', 'admin', 'manager', 'operator', 'viewer'];

const CONFIGURATION_TABS = ['profile', 'units', 'sectors', 'users', 'notifications', 'credits', 'billing', 'api'];

const SETTINGS_SECTIONS = [
    ['profile', 'Perfil', 'Identidade, idioma e segurança'],
    ['units', 'Unidades', 'Locais e estruturas operacionais'],
    ['sectors', 'Setores', 'Áreas e responsabilidades'],
    ['users', 'Usuários', 'Acessos, papéis e vínculos'],
    ['notifications', 'Notificações', 'Canais e regras de alerta'],
    ['credits', 'Créditos IA', 'Consumo e disponibilidade'],
    ['billing', 'Financeiro', 'Plano, cobrança e histórico'],
    ['api', 'API', 'Integrações e webhooks'],
];

const formatUnitAddress = (address) => {
    if (address === null || address === undefined) return '';
    if (typeof address === 'string') return address;
    if (typeof address !== 'object') return String(address);
    const values = Array.isArray(address)
        ? address
        : Object.values(address);
    return values
        .filter((value) => value !== null && value !== undefined && typeof value !== 'object' && String(value).trim())
        .map(String)
        .join(', ');
};

const ConfigurationsRemote = () => {
    const { user, logout } = useAuth();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(() => {
        const requestedTab = searchParams.get('tab');
        return CONFIGURATION_TABS.includes(requestedTab) ? requestedTab : 'profile';
    });
    const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
    const [workspace, setWorkspace] = useState({ timezone: 'America/Sao_Paulo', locale: 'pt-BR' });
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [units, setUnits] = useState([]);
    const [sectors, setSectors] = useState([]);
    const [sectorQuery, setSectorQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [userQuery, setUserQuery] = useState(() => searchParams.get('user') || '');
    const [userScope, setUserScope] = useState('all');
    const [userUnitFilter, setUserUnitFilter] = useState('');
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteDraft, setInviteDraft] = useState(EMPTY_INVITE);
    const [inviteBusy, setInviteBusy] = useState(false);
    const [credits, setCredits] = useState(null);
    const [billing, setBilling] = useState(null);
    const [apiDraft, setApiDraft] = useState({ endpoint_url: '', webhook_url: '', public_key: '' });
    const [unitDraft, setUnitDraft] = useState(EMPTY_UNIT);
    const [sectorDraft, setSectorDraft] = useState(EMPTY_SECTOR);
    const [unitFormOpen, setUnitFormOpen] = useState(false);
    const [sectorFormOpen, setSectorFormOpen] = useState(false);
    const [userDrafts, setUserDrafts] = useState({});
    const [passwordDrafts, setPasswordDrafts] = useState({});
    const [passwordSavingId, setPasswordSavingId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [entitySaving, setEntitySaving] = useState(false);
    const [error, setError] = useState('');
    const [optionalError, setOptionalError] = useState('');

    const visibleUsers = useMemo(() => {
        const normalizedQuery = userQuery.trim().toLocaleLowerCase();
        return users.filter((member) => {
            const role = String(member.role || 'operator').toLocaleLowerCase();
            const managedUnits = Array.isArray(member.managed_units) ? member.managed_units.map(String) : [];
            const matchesScope = userScope === 'all'
                || (userScope === 'managers' && ['owner', 'admin', 'manager'].includes(role))
                || (userScope === 'operators' && ['operator', 'employee', 'viewer'].includes(role));
            const matchesUnit = !userUnitFilter || managedUnits.includes(String(userUnitFilter));
            const searchable = [member.id, member.auth_user_id, member.name, member.email, member.role].filter(Boolean).join(' ').toLocaleLowerCase();
            return matchesScope && matchesUnit && (!normalizedQuery || searchable.includes(normalizedQuery));
        });
    }, [userQuery, userScope, userUnitFilter, users]);

    const visibleSectors = useMemo(
        () => sectors.filter((sector) => matchesSearchText(sector.name, sectorQuery)),
        [sectorQuery, sectors],
    );

    const loadConfiguration = async () => {
        try {
            setLoading(true);
            setError('');
            const results = await Promise.allSettled([
                settingsService.get(),
                settingsService.getUnits(),
                settingsService.getSectors(),
                settingsService.getUsers(),
                settingsService.getAiCreditSummary(),
                settingsService.getBillingSettings(),
                settingsService.getApiSettings(),
            ]);
            const settingsResult = results[0];
            if (settingsResult.status === 'rejected') throw settingsResult.reason;
            const settings = settingsResult.value;
            const optionalFailures = results.slice(1).filter((result) => result.status === 'rejected');
            setOptionalError(optionalFailures.length ? 'Algumas superfícies opcionais ainda não estão disponíveis neste ambiente.' : '');
            const valueOr = (index, fallback) => results[index].status === 'fulfilled' ? results[index].value : fallback;
            const unitsData = valueOr(1, []);
            const sectorsData = valueOr(2, []);
            const usersData = valueOr(3, []);
            const creditsData = valueOr(4, null);
            const billingData = valueOr(5, null);
            const apiData = valueOr(6, null);
            setProfile({
                name: settings.profile?.name || user?.name || '',
                email: settings.profile?.email || user?.email || '',
                phone: settings.profile?.phone || '',
            });
            setWorkspace({
                timezone: settings.workspace?.timezone || 'America/Sao_Paulo',
                locale: settings.workspace?.locale || 'pt-BR',
            });
            setPreferences({ ...DEFAULT_PREFERENCES, ...(settings.profile?.preferences || {}) });
            setUnits(unitsData || []);
            setSectors(sectorsData || []);
            setUsers(usersData || []);
            setCredits(creditsData);
            setBilling(billingData);
            setApiDraft({
                endpoint_url: apiData?.endpoint_url || '',
                webhook_url: apiData?.webhook_url || '',
                public_key: apiData?.public_key || '',
            });
            setUserDrafts(Object.fromEntries((usersData || []).map((member) => [String(member.id), {
                role: member.role || 'operator',
                managed_units: Array.isArray(member.managed_units) ? member.managed_units : [],
            }])));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as configurações remotas.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial remote hydration is intentionally triggered once on mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadConfiguration();
        // Configuration is loaded once per authenticated workspace.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveProfile = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            await settingsService.updateProfile({
                name: profile.name.trim(),
                phone: profile.phone.trim(),
                preferences,
            });
            await settingsService.updateWorkspaceSettings({
                timezone: workspace.timezone,
                locale: workspace.locale,
                settings: { interface: 'white', preferences },
            });
            toast.success('Perfil e preferências salvos.');
        } catch (saveError) {
            toast.error(saveError instanceof Error ? saveError.message : 'Não foi possível salvar as configurações.');
        } finally {
            setSaving(false);
        }
    };

    const saveUnit = async (event) => {
        event.preventDefault();
        try {
            setEntitySaving(true);
            const saved = unitDraft.id
                ? await settingsService.updateUnit(unitDraft.id, unitDraft)
                : await settingsService.createUnit(unitDraft);
            setUnits((current) => unitDraft.id
                ? current.map((item) => item.id === saved.id ? saved : item)
                : [...current, saved].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')));
            setUnitDraft(EMPTY_UNIT);
            setUnitFormOpen(false);
            toast.success(unitDraft.id ? 'Unidade atualizada.' : 'Unidade criada.');
        } catch (saveError) {
            toast.error(saveError instanceof Error ? saveError.message : 'Não foi possível salvar a unidade.');
        } finally {
            setEntitySaving(false);
        }
    };

    const archiveUnit = async (unit) => {
        if (!window.confirm(`Arquivar a unidade “${unit.name}”?`)) return;
        try {
            setEntitySaving(true);
            await settingsService.archiveUnit(unit.id);
            setUnits((current) => current.filter((item) => item.id !== unit.id));
            if (unitDraft.id === unit.id) setUnitDraft(EMPTY_UNIT);
            toast.success('Unidade arquivada.');
        } catch (archiveError) {
            toast.error(archiveError instanceof Error ? archiveError.message : 'Não foi possível arquivar a unidade.');
        } finally {
            setEntitySaving(false);
        }
    };

    const saveSector = async (event) => {
        event.preventDefault();
        try {
            setEntitySaving(true);
            const saved = sectorDraft.id
                ? await settingsService.updateSector(sectorDraft.id, sectorDraft)
                : await settingsService.createSector(sectorDraft);
            setSectors((current) => sectorDraft.id
                ? current.map((item) => item.id === saved.id ? saved : item)
                : [...current, saved].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')));
            setSectorDraft(EMPTY_SECTOR);
            setSectorFormOpen(false);
            toast.success(sectorDraft.id ? 'Setor atualizado.' : 'Setor criado.');
        } catch (saveError) {
            toast.error(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o setor.');
        } finally {
            setEntitySaving(false);
        }
    };

    const archiveSector = async (sector) => {
        if (!window.confirm(`Arquivar o setor “${sector.name}”?`)) return;
        try {
            setEntitySaving(true);
            await settingsService.archiveSector(sector.id);
            setSectors((current) => current.filter((item) => item.id !== sector.id));
            if (sectorDraft.id === sector.id) setSectorDraft(EMPTY_SECTOR);
            toast.success('Setor arquivado.');
        } catch (archiveError) {
            toast.error(archiveError instanceof Error ? archiveError.message : 'Não foi possível arquivar o setor.');
        } finally {
            setEntitySaving(false);
        }
    };

    const saveUser = async (member) => {
        const draft = userDrafts[String(member.id)] || {};
        try {
            setEntitySaving(true);
            const saved = await settingsService.updateUser(member.id, draft);
            setUsers((current) => current.map((item) => item.id === saved.id ? { ...item, ...saved } : item));
            toast.success('Permissões do usuário atualizadas.');
        } catch (saveError) {
            toast.error(saveError instanceof Error ? saveError.message : 'Não foi possível atualizar o usuário.');
        } finally {
            setEntitySaving(false);
        }
    };

    const resetUserPassword = async (member) => {
        const targetUserId = member.auth_user_id || member.user_id;
        const password = String(passwordDrafts[String(member.id)] || '');
        if (!targetUserId) {
            toast.error('Este perfil ainda não possui acesso autenticado.');
            return;
        }
        if (password.length < 12) {
            toast.error('A senha provisória precisa ter pelo menos 12 caracteres.');
            return;
        }
        try {
            setPasswordSavingId(String(member.id));
            await settingsService.resetUserPassword(targetUserId, password);
            setPasswordDrafts((current) => ({ ...current, [String(member.id)]: '' }));
            toast.success('Senha provisória redefinida. O usuário deverá substituí-la.');
        } catch (resetError) {
            toast.error(resetError instanceof Error ? resetError.message : 'Não foi possível redefinir a senha.');
        } finally {
            setPasswordSavingId('');
        }
    };

    const inviteUser = async (event) => {
        event.preventDefault();
        try {
            setInviteBusy(true);
            const inviteResult = await settingsService.inviteUser({
                name: inviteDraft.name.trim(),
                email: inviteDraft.email.trim().toLocaleLowerCase(),
                role: inviteDraft.role,
                managed_units: inviteDraft.managed_units,
            });
            setInviteDraft(EMPTY_INVITE);
            setInviteOpen(false);
            await loadConfiguration();
            toast.success(
                inviteResult?.invitationCreated
                    ? 'Convite enviado.'
                    : 'Acesso do usuário atualizado.',
            );
        } catch (inviteError) {
            toast.error(inviteError instanceof Error ? inviteError.message : 'Não foi possível enviar o convite.');
        } finally {
            setInviteBusy(false);
        }
    };

    const saveApi = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            const saved = await settingsService.updateApiSettings(apiDraft);
            setApiDraft({ endpoint_url: saved?.endpoint_url || '', webhook_url: saved?.webhook_url || '', public_key: saved?.public_key || '' });
            toast.success('Configuração de API salva.');
        } catch (saveError) {
            toast.error(saveError instanceof Error ? saveError.message : 'Não foi possível salvar a API.');
        } finally {
            setSaving(false);
        }
    };

    const updateUserDraft = (member, field, value) => {
        setUserDrafts((current) => ({
            ...current,
            [String(member.id)]: { ...(current[String(member.id)] || {}), [field]: value },
        }));
    };

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center gap-2 bg-[#f7f9fc] p-6 text-[#70868d]"><LoaderCircle size={22} className="animate-spin" /> Carregando configurações remotas…</div>;
    }

    if (error) {
        return <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f7f9fc] p-6 text-center text-[#b42318]"><span>{error}</span><button className="inline-flex min-h-10 items-center rounded-[10px] border border-[#dbe4ea] bg-white px-3 text-xs font-bold text-[#38515f]" type="button" onClick={loadConfiguration}>Tentar novamente</button></div>;
    }

    const activeSection = SETTINGS_SECTIONS.find(([value]) => value === activeTab) || SETTINGS_SECTIONS[0];

    return (
        <div className="min-h-full bg-[#f4f8f7] px-5 pb-12 pt-6 text-[#17333b] sm:px-8 lg:px-14">
            <header className="mx-auto max-w-[1540px] px-1 pb-6">
                <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.13em] text-[#0a9585]">Workspace remoto</p>
                    <h1 className="m-0 text-[clamp(28px,3vw,40px)] font-extrabold tracking-[-0.03em]">Configurações</h1>
                    <p className="mt-2 text-sm text-[#70868d]">Perfil, unidades, setores, usuários e preferências persistidos no Supabase.</p>
                </div>
                <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[#dbe4ea] bg-white px-3 text-xs font-bold text-[#38515f] transition-colors hover:border-[#9bcfc7] hover:text-[#087d70] disabled:cursor-wait disabled:opacity-60" onClick={loadConfiguration} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar dados
                </button>
            </header>

            <div className="mx-auto grid max-w-[1540px] items-start gap-[22px] lg:grid-cols-[282px_minmax(0,1fr)]">
                <aside className="overflow-hidden rounded-[22px] border border-[#dfe9e7] bg-white shadow-[0_18px_42px_rgba(23,64,68,0.07)] lg:sticky lg:top-[18px]">
                    <div className="grid gap-1.5 border-b border-[#e8efee] bg-[#173f46] px-5 py-[22px] text-white">
                        <span className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[#69d5c6]">Centro de controle</span>
                        <strong>Configuração do workspace</strong>
                        <small className="text-[#d5efeb]">Escolha uma área para revisar e administrar.</small>
                    </div>
                    <nav className="grid p-2" aria-label="Seções de configurações">
                        {SETTINGS_SECTIONS.map(([value, label, description], index) => (
                            <button type="button" key={value} className={`grid grid-cols-[32px_minmax(0,1fr)] items-start gap-2.5 rounded-xl p-2.5 text-left transition-colors ${activeTab === value ? 'bg-[#e8f7f4] text-[#087d70]' : 'text-[#38515f] hover:bg-[#f4f8f7]'}`} onClick={() => setActiveTab(value)}>
                                <span className="pt-0.5 text-[11px] font-bold opacity-60">{String(index + 1).padStart(2, '0')}</span>
                                <span><strong className="block text-sm">{label}</strong><small className="mt-0.5 block text-[11px] text-[#70868d]">{description}</small></span>
                            </button>
                        ))}
                    </nav>
                    <div className="m-3 flex gap-2 rounded-xl bg-[#f4f8f7] p-3 text-[#0a9585]">
                        <Shield size={17} />
                        <span><strong className="block text-xs text-[#17333b]">Ambiente protegido</strong><small className="block text-[11px] text-[#70868d]">Alterações respeitam perfil e RLS.</small></span>
                    </div>
                </aside>

                <main className="min-w-0">
                    <header className="mb-4 flex items-start justify-between gap-4 rounded-[22px] border border-[#dfe9e7] bg-white p-5 shadow-[0_10px_30px_rgba(23,64,68,0.05)] max-[640px]:flex-col">
                        <div>
                            <p className="mb-1 text-xs font-bold uppercase tracking-[0.13em] text-[#0a9585]">Área selecionada</p>
                            <h2 className="m-0 text-2xl font-extrabold tracking-[-0.025em]">{activeSection[1]}</h2>
                            <p className="mt-1 text-sm text-[#70868d]">{activeSection[2]}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${optionalError ? 'bg-[#fff5df] text-[#b7791f]' : 'bg-[#e8f7f4] text-[#087d70]'}`}>
                            {optionalError ? 'Sincronização parcial' : 'Dados sincronizados'}
                        </span>
                    </header>
                    {optionalError && <div className="mb-4 rounded-xl border border-[#f0c36d] bg-[#fff9e8] px-3.5 py-3 text-sm text-[#76520b]">{optionalError}</div>}

            {activeTab === 'profile' && (
                <form onSubmit={saveProfile} className="grid gap-[22px] lg:grid-cols-2">
                    <section className="rounded-[22px] border border-[#dfe9e7] bg-white p-5 shadow-[0_10px_30px_rgba(23,64,68,0.05)]">
                        <div className="mb-5 flex items-center gap-3 border-b border-[#e8efee] pb-4"><span className="grid size-9 place-items-center rounded-lg bg-[#e8f7f4] text-[#0a9585]"><User size={18} /></span><div><h2 className="m-0 text-lg font-extrabold">Perfil</h2><p className="m-0 mt-1 text-sm text-[#70868d]">Dados da conta autenticada</p></div></div>
                        <label className="mb-4 grid gap-1.5 text-sm font-bold text-[#38515f]"><span>Nome completo</span><input className="min-h-10 rounded-[10px] border border-[#cfdee2] px-3 text-sm font-normal text-[#17333b] outline-none focus:border-[#0b9788] focus:outline-2 focus:outline-[#0b9788]/15" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required /></label>
                        <label className="mb-4 grid gap-1.5 text-sm font-bold text-[#38515f]"><span>E-mail</span><input className="min-h-10 rounded-[10px] border border-[#cfdee2] bg-[#f4f8f7] px-3 text-sm font-normal text-[#70868d] outline-none" value={profile.email} readOnly /></label>
                        <label className="grid gap-1.5 text-sm font-bold text-[#38515f]"><span>Telefone</span><input className="min-h-10 rounded-[10px] border border-[#cfdee2] px-3 text-sm font-normal text-[#17333b] outline-none focus:border-[#0b9788] focus:outline-2 focus:outline-[#0b9788]/15" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="Opcional" /></label>
                        <div className="mt-4 flex items-center gap-2 text-xs text-[#70868d]"><Shield size={16} /><span>{user?.role || 'Usuário'} · dados protegidos por RLS</span></div>
                    </section>
                    <section className="rounded-[22px] border border-[#dfe9e7] bg-white p-5 shadow-[0_10px_30px_rgba(23,64,68,0.05)]">
                        <div className="mb-5 flex items-center gap-3 border-b border-[#e8efee] pb-4"><span className="grid size-9 place-items-center rounded-lg bg-[#e8f7f4] text-[#0a9585]"><SettingsIcon size={18} /></span><div><h2 className="m-0 text-lg font-extrabold">Idioma e fuso</h2><p className="m-0 mt-1 text-sm text-[#70868d]">Preferências do workspace</p></div></div>
                        <label className="mb-4 grid gap-1.5 text-sm font-bold text-[#38515f]"><span>Fuso horário</span><select className="min-h-10 rounded-[10px] border border-[#cfdee2] px-3 text-sm font-normal" value={workspace.timezone} onChange={(event) => setWorkspace({ ...workspace, timezone: event.target.value })}><option value="America/Sao_Paulo">America/Sao_Paulo</option><option value="America/New_York">America/New_York</option><option value="UTC">UTC</option></select></label>
                        <label className="mb-4 grid gap-1.5 text-sm font-bold text-[#38515f]"><span>Idioma</span><select className="min-h-10 rounded-[10px] border border-[#cfdee2] px-3 text-sm font-normal" value={workspace.locale} onChange={(event) => setWorkspace({ ...workspace, locale: event.target.value })}><option value="pt-BR">Português (Brasil)</option><option value="en-US">English (US)</option></select></label>
                        <div className="mt-4 flex items-center gap-2 text-xs text-[#70868d]"><Check size={16} /><span>Interface branca ativa</span></div>
                    </section>
                    <div className="flex justify-end"><button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#173f46] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60" disabled={saving}>{saving ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}{saving ? 'Salvando…' : 'Salvar alterações'}</button></div>
                </form>
            )}

            {activeTab === 'notifications' && (
                <form onSubmit={saveProfile} className="grid gap-[22px] lg:grid-cols-2">
                    <section className="rounded-[22px] border border-[#dfe9e7] bg-white p-5 shadow-[0_10px_30px_rgba(23,64,68,0.05)]">
                        <div className="mb-5 flex items-center gap-3 border-b border-[#e8efee] pb-4"><span className="grid size-9 place-items-center rounded-lg bg-[#e8f7f4] text-[#0a9585]"><SettingsIcon size={18} /></span><div><h2 className="m-0 text-lg font-extrabold">Notificações</h2><p className="m-0 mt-1 text-sm text-[#70868d]">Preferências persistidas no perfil</p></div></div>
                        <label className="mb-3 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#e8efee] p-3"><span><strong className="block text-sm">Notificações do workspace</strong><small className="block text-xs text-[#70868d]">Mostrar alertas operacionais</small></span><input className="size-4 accent-[#0a9585]" type="checkbox" checked={preferences.pushNotifications} onChange={(event) => setPreferences({ ...preferences, pushNotifications: event.target.checked })} /></label>
                        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#e8efee] p-3"><span><strong className="block text-sm">Resumo por e-mail</strong><small className="block text-xs text-[#70868d]">Receber resumo operacional</small></span><input className="size-4 accent-[#0a9585]" type="checkbox" checked={preferences.emailDigest} onChange={(event) => setPreferences({ ...preferences, emailDigest: event.target.checked })} /></label>
                    </section>
                    <section className="rounded-[22px] border border-[#dfe9e7] bg-white p-5 shadow-[0_10px_30px_rgba(23,64,68,0.05)]">
                        <div className="mb-5 flex items-center gap-3 border-b border-[#e8efee] pb-4"><span className="grid size-9 place-items-center rounded-lg bg-[#e8f7f4] text-[#0a9585]"><Smartphone size={18} /></span><div><h2 className="m-0 text-lg font-extrabold">Experiência</h2><p className="m-0 mt-1 text-sm text-[#70868d]">Feedback durante a operação</p></div></div>
                        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#e8efee] p-3"><span><strong className="block text-sm">Efeitos sonoros</strong><small className="block text-xs text-[#70868d]">Feedback de ações concluídas</small></span><input className="size-4 accent-[#0a9585]" type="checkbox" checked={preferences.soundEffects} onChange={(event) => setPreferences({ ...preferences, soundEffects: event.target.checked })} /></label>
                    </section>
                    <div className="flex justify-end"><button type="submit" className="inline-flex min-h-10 items-center rounded-xl bg-[#173f46] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60" disabled={saving}>{saving ? 'Salvando…' : 'Salvar preferências'}</button></div>
                </form>
            )}

            {activeTab === 'units' && (
                    <section className="rounded-[22px] border border-[#dfe9e7] bg-white p-5 shadow-[0_10px_30px_rgba(23,64,68,0.05)]">
                    <div className="mb-5 flex items-center justify-between gap-4"><div className="mb-5 flex items-center gap-3"><span><Building2 size={18} /></span><div><h2>Unidades</h2><p>{units.length} unidades ativas no workspace</p></div></div>{!unitFormOpen && <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#173f46] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0a9585]" onClick={() => { setUnitDraft(EMPTY_UNIT); setUnitFormOpen(true); }}><Plus size={16} /> Nova unidade</button>}</div>
                    {unitFormOpen && (
                    <form onSubmit={saveUnit} className="grid gap-3 rounded-xl border border-[#e8efee] bg-[#f9fcfb] p-4">
                        <label className="grid gap-2 text-sm font-bold text-[#38515f]"><span>Nome</span><input className="min-h-10 rounded-[10px] border border-[#cfdee2] px-3 text-sm font-normal outline-none focus:border-[#0b9788]" value={unitDraft.name} onChange={(event) => setUnitDraft({ ...unitDraft, name: event.target.value })} placeholder="Ex.: Loja Centro" required autoFocus /></label>
                        <label className="grid gap-2 text-sm font-bold text-[#38515f]"><span>Endereço</span><input className="min-h-10 rounded-[10px] border border-[#cfdee2] px-3 text-sm font-normal outline-none focus:border-[#0b9788]" value={unitDraft.address} onChange={(event) => setUnitDraft({ ...unitDraft, address: event.target.value })} placeholder="Opcional" /></label>
                        <label className="grid gap-2 text-sm font-bold text-[#38515f]"><span>Fuso horário</span><select className="min-h-10 rounded-[10px] border border-[#cfdee2] px-3 text-sm font-normal outline-none focus:border-[#0b9788]" value={unitDraft.timezone} onChange={(event) => setUnitDraft({ ...unitDraft, timezone: event.target.value })}><option value="America/Sao_Paulo">America/Sao_Paulo</option><option value="UTC">UTC</option></select></label>
                        <div className="flex flex-wrap gap-2"><button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#173f46] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0a9585] disabled:cursor-wait disabled:opacity-60" disabled={entitySaving}>{entitySaving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}{unitDraft.id ? 'Atualizar' : 'Criar'}</button><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4ea] bg-white px-3.5 py-2 text-xs font-bold text-[#38515f]" onClick={() => { setUnitDraft(EMPTY_UNIT); setUnitFormOpen(false); }}>Cancelar</button></div>
                    </form>
                    )}
                    <div className="grid gap-3">{units.length === 0 ? <div className="rounded-xl border border-dashed border-[#cbdedb] p-6 text-center text-sm text-[#70868d]">Nenhuma unidade cadastrada. Crie a primeira para vincular checklists.</div> : units.map((unit) => <article className="flex items-center justify-between gap-3 rounded-xl border border-[#e8efee] p-4" key={unit.id}><div><strong>{unit.name}</strong><small className="mt-1 block text-xs text-[#70868d]">{formatUnitAddress(unit.address) || 'Sem endereço'} · {unit.timezone || 'America/Sao_Paulo'}</small></div><div className="flex flex-wrap gap-1"><button type="button" className="rounded-lg p-2 text-[#38515f] hover:bg-[#f4f8f7]" onClick={() => { setUnitDraft({ id: unit.id, name: unit.name || '', address: formatUnitAddress(unit.address), timezone: unit.timezone || 'America/Sao_Paulo' }); setUnitFormOpen(true); }} aria-label={`Editar ${unit.name}`} title="Editar"><Pencil size={15} /></button><button type="button" className="rounded-lg p-2 text-[#b42318] hover:bg-[#fff1f1]" onClick={() => archiveUnit(unit)} aria-label={`Arquivar ${unit.name}`} title="Arquivar"><Archive size={15} /></button></div></article>)}</div>
                </section>
            )}

            {activeTab === 'sectors' && (
                    <section className="rounded-[22px] border border-[#dfe9e7] bg-white p-5 shadow-[0_10px_30px_rgba(23,64,68,0.05)]">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span><Layers3 size={18} /></span>
                            <div>
                                <h2>Setores</h2>
                                <p>Organize as áreas usadas para distribuir e acompanhar as rotinas.</p>
                            </div>
                        </div>
                        {!sectorFormOpen && <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#0a9585] px-3 py-2 text-xs font-bold text-white" onClick={() => { setSectorDraft(EMPTY_SECTOR); setSectorFormOpen(true); }}><Plus size={16} /> Novo setor</button>}
                    </div>
                    {sectorFormOpen && (
                        <form onSubmit={saveSector} className="grid gap-3 rounded-xl bg-[#f7faf9] p-4">
                            <div className="mb-4 grid gap-1">
                                <strong>{sectorDraft.id ? 'Editar setor' : 'Criar setor'}</strong>
                                <span>Use um nome curto e reconhecível para toda a equipe.</span>
                            </div>
                                <label className="grid gap-1.5 text-sm font-bold text-[#38515f]">
                                <span>Nome do setor</span>
                                <input value={sectorDraft.name} onChange={(event) => setSectorDraft({ ...sectorDraft, name: event.target.value })} placeholder="Ex.: Cozinha" required autoFocus />
                            </label>
                                <div className="flex flex-wrap gap-2">
                                <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#0a9585] px-3 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={entitySaving}>{entitySaving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}{sectorDraft.id ? 'Salvar alterações' : 'Criar setor'}</button>
                                <button type="button" className="rounded-lg px-3 py-2 text-xs font-bold text-[#0a9585]" onClick={() => { setSectorDraft(EMPTY_SECTOR); setSectorFormOpen(false); }}>Cancelar</button>
                            </div>
                        </form>
                    )}
                    {sectors.length > 0 && (
                        <div className="mb-4 flex items-center justify-between gap-4 max-[640px]:flex-col max-[640px]:items-stretch">
                            <div>
                                <strong>{sectors.length}</strong>
                                <span>{sectors.length === 1 ? 'setor ativo' : 'setores ativos'}</span>
                            </div>
                            <label className="flex min-h-10 items-center gap-2 rounded-[10px] border border-[#dbe4ea] px-3 text-[#70868d]">
                                <Search size={16} aria-hidden="true" />
                                <input value={sectorQuery} onChange={(event) => setSectorQuery(event.target.value)} placeholder="Buscar setor..." aria-label="Buscar setor" />
                            </label>
                        </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                        {sectors.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#cbdedb] p-6 text-center text-sm text-[#70868d]">Nenhum setor cadastrado. Crie o primeiro para classificar checklists.</div>
                        ) : visibleSectors.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#cbdedb] p-6 text-center text-sm text-[#70868d]">Nenhum setor corresponde à busca.</div>
                        ) : visibleSectors.map((sector) => (
                            <article className="flex items-center gap-3 rounded-xl border border-[#e8efee] p-4" key={sector.id}>
                                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e8f7f4] font-bold text-[#0a9585]" aria-hidden="true">{sector.name?.trim()?.charAt(0)?.toLocaleUpperCase() || 'S'}</div>
                                <div className="min-w-0 flex-1">
                                    <strong className="block truncate">{sector.name}</strong>
                                    <span className="text-xs text-[#70868d]">Área operacional</span>
                                </div>
                                <div className="flex gap-1">
                                    <button type="button" className="rounded-lg p-2 text-[#38515f] hover:bg-[#f4f8f7]" onClick={() => { setSectorDraft({ id: sector.id, name: sector.name || '', system_key: sector.system_key || '' }); setSectorFormOpen(true); }} aria-label={`Editar ${sector.name}`} title="Editar setor"><Pencil size={16} /></button>
                                    <button type="button" className="rounded-lg p-2 text-[#b42318] hover:bg-[#fff1f1]" onClick={() => archiveSector(sector)} aria-label={`Arquivar ${sector.name}`} title="Arquivar setor"><Archive size={16} /></button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {activeTab === 'users' && (
                <section className="rounded-[22px] border border-[#dfe9e7] bg-white p-5 shadow-[0_10px_30px_rgba(23,64,68,0.05)]">
                    <div className="mb-4 flex items-start justify-between gap-3 max-[640px]:flex-col">
                        <div className="mb-5 flex items-center gap-3 border-b border-[#e8efee] pb-4"><span><UsersRound size={18} /></span><div><h2>Usuários</h2><p>{visibleUsers.length} de {users.length} usuários do workspace</p></div></div>
                        <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#173f46] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60" onClick={() => setInviteOpen(true)}><UserPlus size={16} /> Novo usuário</button>
                    </div>
                    <div className="mb-4 flex flex-wrap gap-3">
                        <label className="flex min-h-10 min-w-60 flex-1 items-center gap-2 rounded-lg border border-[#dbe4ea] px-3 text-[#70868d]">
                            <Search size={16} aria-hidden="true" />
                            <input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Buscar por nome ou e-mail..." aria-label="Buscar por nome ou e-mail" />
                        </label>
                        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtro de usuários">
                            {[
                                ['all', `Todos ${users.length}`],
                                ['managers', `Gestores ${users.filter((member) => ['owner', 'admin', 'manager'].includes(String(member.role || '').toLocaleLowerCase())).length}`],
                                ['operators', `Operadores ${users.filter((member) => ['operator', 'employee', 'viewer'].includes(String(member.role || '').toLocaleLowerCase())).length}`],
                            ].map(([value, label]) => <button type="button" key={value} className={userScope === value ? 'is-active' : ''} onClick={() => setUserScope(value)} role="tab" aria-selected={userScope === value}>{label}</button>)}
                        </div>
                        <label className="grid min-w-40 gap-1 text-sm font-bold text-[#38515f]">
                            Unidade
                            <select value={userUnitFilter} onChange={(event) => setUserUnitFilter(event.target.value)} aria-label="Filtrar usuários por unidade">
                                <option value="">Todas</option>
                                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                            </select>
                        </label>
                    </div>
                    {visibleUsers.length === 0 ? <div className="rounded-xl border border-dashed border-[#cbdedb] p-6 text-center text-sm text-[#70868d]">Nenhum usuário corresponde aos filtros atuais.</div> : <div className="grid gap-3">{visibleUsers.map((member) => { const draft = userDrafts[String(member.id)] || { role: member.role || 'operator' }; const currentUnits = Array.isArray(draft.managed_units) ? draft.managed_units : []; return <article className="grid gap-3 rounded-xl border border-[#dfe9e7] bg-[#f9fcfb] p-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]" key={member.id}><div><strong>{member.name || member.email}</strong><small>{member.email || 'Sem e-mail'} · {member.execution_count || 0} execuções</small></div><select value={draft.role} onChange={(event) => updateUserDraft(member, 'role', event.target.value)} aria-label={`Papel de ${member.name || member.email}`}>{[...new Set([...ROLE_OPTIONS, draft.role])].map((role) => <option key={role} value={role}>{role}</option>)}</select><select multiple value={currentUnits.map(String)} onChange={(event) => updateUserDraft(member, 'managed_units', Array.from(event.target.selectedOptions, (option) => option.value))} aria-label={`Unidades de ${member.name || member.email}`}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#173f46] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60" onClick={() => saveUser(member)} disabled={entitySaving}><Save size={15} /> Salvar</button><div className="flex flex-wrap items-center gap-2 md:col-span-full"><input type="password" autoComplete="new-password" minLength={12} value={passwordDrafts[String(member.id)] || ''} onChange={(event) => setPasswordDrafts((current) => ({ ...current, [String(member.id)]: event.target.value }))} placeholder="Senha provisória" aria-label={`Nova senha de ${member.name || member.email}`} /><button type="button" className="rounded-lg border border-[#cbdedb] px-3 py-2 text-xs font-bold text-[#38515f] hover:bg-[#f4f8f7] disabled:opacity-60" onClick={() => resetUserPassword(member)} disabled={passwordSavingId === String(member.id)}>{passwordSavingId === String(member.id) ? 'Redefinindo…' : 'Redefinir senha'}</button></div></article>; })}</div>}
                </section>
            )}

            {activeTab === 'credits' && (
                <section className="rounded-[22px] border border-[#dfe9e7] bg-white p-5 shadow-[0_10px_30px_rgba(23,64,68,0.05)]">
                    <div className="mb-5 flex items-center gap-3 border-b border-[#e8efee] pb-4"><span><SettingsIcon size={18} /></span><div><h2>Créditos IA</h2><p>Saldo retornado pelo workspace remoto</p></div></div>
                    {!credits ? <div className="rounded-xl border border-dashed border-[#cbdedb] p-6 text-center text-sm text-[#70868d]">Carteira de créditos ainda não configurada.</div> : <div className="grid grid-cols-4 gap-3 max-[700px]:grid-cols-2"><div><span>Incluídos</span><strong>{credits.included_credits}</strong></div><div><span>Comprados</span><strong>{credits.purchased_credits}</strong></div><div><span>Consumidos</span><strong>{credits.consumed_credits}</strong></div><div><span>Disponíveis</span><strong>{credits.available_credits}</strong></div></div>}
                </section>
            )}

            {activeTab === 'billing' && (
                <section className="rounded-[22px] border border-[#dfe9e7] bg-white p-5 shadow-[0_10px_30px_rgba(23,64,68,0.05)]">
                    <div className="mb-5 flex items-center gap-3 border-b border-[#e8efee] pb-4"><span><SettingsIcon size={18} /></span><div><h2>Financeiro</h2><p>Informações de cobrança retornadas pelo workspace</p></div></div>
                    {!billing ? <div className="rounded-xl border border-dashed border-[#cbdedb] p-6 text-center text-sm text-[#70868d]">Dados financeiros ainda não configurados.</div> : <div className="grid grid-cols-4 gap-3 max-[700px]:grid-cols-2"><div><span>Plano</span><strong>{billing.plan_name || '-'}</strong></div><div><span>Status</span><strong>{billing.status || '-'}</strong></div><div><span>Valor</span><strong>{billing.amount_cents == null ? '-' : `${billing.currency || 'BRL'} ${(billing.amount_cents / 100).toFixed(2)}`}</strong></div><div><span>Fim do período</span><strong>{billing.period_end ? new Date(billing.period_end).toLocaleDateString('pt-BR') : '-'}</strong></div></div>}
                </section>
            )}

            {activeTab === 'api' && (
                <form onSubmit={saveApi} className="grid gap-4 lg:grid-cols-2">
                    <section className="rounded-[22px] border border-[#dfe9e7] bg-white p-5 shadow-[0_10px_30px_rgba(23,64,68,0.05)]">
                        <div className="mb-5 flex items-center gap-3 border-b border-[#e8efee] pb-4"><span><SettingsIcon size={18} /></span><div><h2>API e integrações</h2><p>Endpoints públicos configurados para este workspace</p></div></div>
                        <label className="grid gap-1.5 text-sm font-bold text-[#38515f]"><span>Endpoint base</span><input className="min-h-10 rounded-[10px] border border-[#cfdee2] px-3 text-sm font-normal" type="url" value={apiDraft.endpoint_url} onChange={(event) => setApiDraft({ ...apiDraft, endpoint_url: event.target.value })} placeholder="https://..." /></label>
                        <label className="grid gap-1.5 text-sm font-bold text-[#38515f]"><span>Webhook</span><input className="min-h-10 rounded-[10px] border border-[#cfdee2] px-3 text-sm font-normal" type="url" value={apiDraft.webhook_url} onChange={(event) => setApiDraft({ ...apiDraft, webhook_url: event.target.value })} placeholder="https://..." /></label>
                        <label className="grid gap-1.5 text-sm font-bold text-[#38515f]"><span>Chave pública</span><input className="min-h-10 rounded-[10px] border border-[#cfdee2] px-3 text-sm font-normal" value={apiDraft.public_key} onChange={(event) => setApiDraft({ ...apiDraft, public_key: event.target.value })} placeholder="Não armazene segredo aqui" /></label>
                        <div className="mt-4 flex items-center gap-2 text-xs text-[#70868d]"><Shield size={16} /><span>Segredos de integração não são exibidos nem persistidos nesta tela.</span></div>
                    </section>
                    <div className="flex justify-end"><button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#173f46] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60" disabled={saving}>{saving ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}{saving ? 'Salvando…' : 'Salvar API'}</button></div>
                </form>
            )}

            {inviteOpen && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-[#102d33]/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setInviteOpen(false); }}>
                    <form className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#dfe9e7] bg-white p-5 shadow-2xl" onSubmit={inviteUser} role="dialog" aria-modal="true" aria-labelledby="invite-user-title">
                        <div className="mb-5 flex items-start justify-between gap-3 border-b border-[#e8efee] pb-4">
                            <div><p className="remote-eyebrow">Acesso ao workspace</p><h2 id="invite-user-title">Adicionar novo usuário</h2></div>
                            <button type="button" className="grid size-9 place-items-center rounded-lg text-xl text-[#38515f] hover:bg-[#f4f8f7]" onClick={() => setInviteOpen(false)} aria-label="Fechar novo usuário">×</button>
                        </div>
                        <label className="grid gap-1.5 text-sm font-bold text-[#38515f]"><span>Nome completo</span><input className="min-h-10 rounded-[10px] border border-[#cfdee2] px-3 text-sm font-normal" value={inviteDraft.name} onChange={(event) => setInviteDraft({ ...inviteDraft, name: event.target.value })} required /></label>
                        <label className="grid gap-1.5 text-sm font-bold text-[#38515f]"><span>E-mail</span><input className="min-h-10 rounded-[10px] border border-[#cfdee2] px-3 text-sm font-normal" type="email" value={inviteDraft.email} onChange={(event) => setInviteDraft({ ...inviteDraft, email: event.target.value })} placeholder="nome@empresa.com" required /></label>
                        <label className="grid gap-1.5 text-sm font-bold text-[#38515f]"><span>Perfil de acesso</span><select className="min-h-10 rounded-[10px] border border-[#cfdee2] px-3 text-sm font-normal" value={inviteDraft.role} onChange={(event) => setInviteDraft({ ...inviteDraft, role: event.target.value })}>{ROLE_OPTIONS.filter((role) => role !== 'owner').map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
                        <label className="grid gap-1.5 text-sm font-bold text-[#38515f]"><span>Unidades vinculadas</span><select className="min-h-24 rounded-[10px] border border-[#cfdee2] px-3 text-sm font-normal" multiple value={inviteDraft.managed_units.map(String)} onChange={(event) => setInviteDraft({ ...inviteDraft, managed_units: Array.from(event.target.selectedOptions, (option) => option.value) })}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
                        <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#f1f7f6] p-3 text-xs text-[#38515f]"><Mail size={15} /> O convite será enviado pelo backend autenticado do Supabase; a sessão atual do gestor não será substituída.</p>
                        <div className="mt-5 flex justify-end gap-2"><button type="button" className="rounded-lg px-3 py-2 text-xs font-bold text-[#0a9585]" onClick={() => setInviteOpen(false)}>Cancelar</button><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#0a9585] px-3 py-2 text-xs font-bold text-white disabled:opacity-60" disabled={inviteBusy}>{inviteBusy ? <LoaderCircle size={15} className="animate-spin" /> : <UserPlus size={15} />}{inviteBusy ? 'Enviando…' : 'Enviar convite'}</button></div>
                    </form>
                </div>
            )}

                </main>
            </div>

            <div className="mx-auto mt-5 flex max-w-7xl items-center justify-between gap-3 border-t border-[#dbe4ea] pt-4 max-[640px]:items-start max-[640px]:flex-col">
                <div><strong className="block text-sm">Sessão e segurança</strong><span className="text-xs text-[#70868d]">Encerre o acesso neste dispositivo.</span></div>
                <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-[#f1c8c3] px-3 py-2 text-xs font-bold text-[#b42318]" onClick={logout}><LogOut size={17} /> Sair da conta</button>
            </div>
        </div>
    );
};

export default ConfigurationsRemote;
