import { useEffect, useMemo, useState } from 'react';
import { Archive, Building2, Check, Layers3, LoaderCircle, LogOut, Mail, Pencil, Plus, RefreshCw, Save, Search, Settings as SettingsIcon, Shield, Smartphone, User, UserPlus, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { settingsService } from '../services/checklistProducaoService';
import '../styles/settings-remote.css';

const DEFAULT_PREFERENCES = {
    pushNotifications: true,
    emailDigest: false,
    soundEffects: true,
};

const EMPTY_UNIT = { id: null, name: '', address: '', timezone: 'America/Sao_Paulo' };
const EMPTY_SECTOR = { id: null, name: '', system_key: '' };
const EMPTY_INVITE = { name: '', email: '', role: 'operator', managed_units: [] };
const ROLE_OPTIONS = ['owner', 'admin', 'manager', 'operator', 'viewer'];

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
    const [activeTab, setActiveTab] = useState('profile');
    const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
    const [workspace, setWorkspace] = useState({ timezone: 'America/Sao_Paulo', locale: 'pt-BR' });
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [units, setUnits] = useState([]);
    const [sectors, setSectors] = useState([]);
    const [users, setUsers] = useState([]);
    const [userQuery, setUserQuery] = useState('');
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
            const searchable = [member.name, member.email, member.role].filter(Boolean).join(' ').toLocaleLowerCase();
            return matchesScope && matchesUnit && (!normalizedQuery || searchable.includes(normalizedQuery));
        });
    }, [userQuery, userScope, userUnitFilter, users]);

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

    const inviteUser = async (event) => {
        event.preventDefault();
        try {
            setInviteBusy(true);
            await settingsService.inviteUser({
                name: inviteDraft.name.trim(),
                email: inviteDraft.email.trim().toLocaleLowerCase(),
                role: inviteDraft.role,
                managed_units: inviteDraft.managed_units,
            });
            setInviteDraft(EMPTY_INVITE);
            setInviteOpen(false);
            await loadConfiguration();
            toast.success('Convite enviado.');
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
        return <div className="settings-remote-state"><LoaderCircle size={22} className="is-spinning" /> Carregando configurações remotas…</div>;
    }

    if (error) {
        return <div className="settings-remote-state settings-remote-error"><span>{error}</span><button type="button" onClick={loadConfiguration}>Tentar novamente</button></div>;
    }

    return (
        <div className="settings-remote ritmika-light-mode">
            <header className="settings-remote-header">
                <div>
                    <p className="remote-eyebrow">Workspace remoto</p>
                    <h1>Configurações</h1>
                    <p>Perfil, unidades, setores, usuários e preferências persistidos no Supabase.</p>
                </div>
                <button type="button" className="settings-system-row" onClick={loadConfiguration} disabled={loading}>
                    <RefreshCw size={16} /> Atualizar dados
                </button>
            </header>

            <nav className="settings-tab-list" aria-label="Seções de configurações">
                {[
                    ['profile', 'Perfil'],
                    ['units', 'Unidades'],
                    ['sectors', 'Setores'],
                    ['users', 'Usuários'],
                    ['notifications', 'Notificações'],
                    ['credits', 'Créditos IA'],
                    ['billing', 'Financeiro'],
                    ['api', 'API'],
                ].map(([value, label]) => (
                    <button type="button" key={value} className={'settings-tab ' + (activeTab === value ? 'is-active' : '')} onClick={() => setActiveTab(value)}>
                        {label}
                    </button>
                ))}
            </nav>
            {optionalError && <div className="settings-optional-warning">{optionalError}</div>}

            {activeTab === 'profile' && (
                <form onSubmit={saveProfile} className="settings-remote-grid">
                    <section className="settings-remote-panel">
                        <div className="settings-remote-section-heading"><span><User size={18} /></span><div><h2>Perfil</h2><p>Dados da conta autenticada</p></div></div>
                        <label className="settings-field"><span>Nome completo</span><input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required /></label>
                        <label className="settings-field"><span>E-mail</span><input value={profile.email} readOnly /></label>
                        <label className="settings-field"><span>Telefone</span><input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="Opcional" /></label>
                        <div className="settings-account-meta"><Shield size={16} /><span>{user?.role || 'Usuário'} · dados protegidos por RLS</span></div>
                    </section>
                    <section className="settings-remote-panel">
                        <div className="settings-remote-section-heading"><span><SettingsIcon size={18} /></span><div><h2>Idioma e fuso</h2><p>Preferências do workspace</p></div></div>
                        <label className="settings-field"><span>Fuso horário</span><select value={workspace.timezone} onChange={(event) => setWorkspace({ ...workspace, timezone: event.target.value })}><option value="America/Sao_Paulo">America/Sao_Paulo</option><option value="America/New_York">America/New_York</option><option value="UTC">UTC</option></select></label>
                        <label className="settings-field"><span>Idioma</span><select value={workspace.locale} onChange={(event) => setWorkspace({ ...workspace, locale: event.target.value })}><option value="pt-BR">Português (Brasil)</option><option value="en-US">English (US)</option></select></label>
                        <div className="settings-account-meta"><Check size={16} /><span>Interface branca ativa</span></div>
                    </section>
                    <div className="settings-remote-actions"><button type="submit" className="settings-save" disabled={saving}>{saving ? <LoaderCircle size={17} className="is-spinning" /> : <Save size={17} />}{saving ? 'Salvando…' : 'Salvar alterações'}</button></div>
                </form>
            )}

            {activeTab === 'notifications' && (
                <form onSubmit={saveProfile} className="settings-remote-grid">
                    <section className="settings-remote-panel">
                        <div className="settings-remote-section-heading"><span><SettingsIcon size={18} /></span><div><h2>Notificações</h2><p>Preferências persistidas no perfil</p></div></div>
                        <label className="settings-toggle-row"><span><span><strong>Notificações do workspace</strong><small>Mostrar alertas operacionais</small></span></span><input type="checkbox" checked={preferences.pushNotifications} onChange={(event) => setPreferences({ ...preferences, pushNotifications: event.target.checked })} /></label>
                        <label className="settings-toggle-row"><span><span><strong>Resumo por e-mail</strong><small>Receber resumo operacional</small></span></span><input type="checkbox" checked={preferences.emailDigest} onChange={(event) => setPreferences({ ...preferences, emailDigest: event.target.checked })} /></label>
                    </section>
                    <section className="settings-remote-panel">
                        <div className="settings-remote-section-heading"><span><Smartphone size={18} /></span><div><h2>Experiência</h2><p>Feedback durante a operação</p></div></div>
                        <label className="settings-toggle-row"><span><span><strong>Efeitos sonoros</strong><small>Feedback de ações concluídas</small></span></span><input type="checkbox" checked={preferences.soundEffects} onChange={(event) => setPreferences({ ...preferences, soundEffects: event.target.checked })} /></label>
                    </section>
                    <div className="settings-remote-actions"><button type="submit" className="settings-save" disabled={saving}>{saving ? 'Salvando…' : 'Salvar preferências'}</button></div>
                </form>
            )}

            {activeTab === 'units' && (
                <section className="settings-remote-panel settings-entity-panel">
                    <div className="settings-entity-toolbar"><div className="settings-remote-section-heading"><span><Building2 size={18} /></span><div><h2>Unidades</h2><p>{units.length} unidades ativas no workspace</p></div></div>{!unitFormOpen && <button type="button" className="settings-save" onClick={() => { setUnitDraft(EMPTY_UNIT); setUnitFormOpen(true); }}><Plus size={16} /> Nova unidade</button>}</div>
                    {unitFormOpen && (
                    <form onSubmit={saveUnit} className="settings-entity-form">
                        <label className="settings-field"><span>Nome</span><input value={unitDraft.name} onChange={(event) => setUnitDraft({ ...unitDraft, name: event.target.value })} placeholder="Ex.: Loja Centro" required autoFocus /></label>
                        <label className="settings-field"><span>Endereço</span><input value={unitDraft.address} onChange={(event) => setUnitDraft({ ...unitDraft, address: event.target.value })} placeholder="Opcional" /></label>
                        <label className="settings-field"><span>Fuso horário</span><select value={unitDraft.timezone} onChange={(event) => setUnitDraft({ ...unitDraft, timezone: event.target.value })}><option value="America/Sao_Paulo">America/Sao_Paulo</option><option value="UTC">UTC</option></select></label>
                        <div className="settings-inline-actions"><button type="submit" className="settings-save" disabled={entitySaving}>{entitySaving ? <LoaderCircle size={15} className="is-spinning" /> : <Save size={15} />}{unitDraft.id ? 'Atualizar' : 'Criar'}</button><button type="button" className="settings-system-row" onClick={() => { setUnitDraft(EMPTY_UNIT); setUnitFormOpen(false); }}>Cancelar</button></div>
                    </form>
                    )}
                    <div className="settings-entity-list">{units.length === 0 ? <div className="settings-empty-note">Nenhuma unidade cadastrada. Crie a primeira para vincular checklists.</div> : units.map((unit) => <article className="settings-entity-row" key={unit.id}><div><strong>{unit.name}</strong><small>{formatUnitAddress(unit.address) || 'Sem endereço'} · {unit.timezone || 'America/Sao_Paulo'}</small></div><div className="settings-inline-actions"><button type="button" className="settings-icon-action" onClick={() => { setUnitDraft({ id: unit.id, name: unit.name || '', address: formatUnitAddress(unit.address), timezone: unit.timezone || 'America/Sao_Paulo' }); setUnitFormOpen(true); }} aria-label={`Editar ${unit.name}`} title="Editar"><Pencil size={15} /></button><button type="button" className="settings-icon-action danger" onClick={() => archiveUnit(unit)} aria-label={`Arquivar ${unit.name}`} title="Arquivar"><Archive size={15} /></button></div></article>)}</div>
                </section>
            )}

            {activeTab === 'sectors' && (
                <section className="settings-remote-panel settings-entity-panel">
                    <div className="settings-entity-toolbar"><div className="settings-remote-section-heading"><span><Layers3 size={18} /></span><div><h2>Setores</h2><p>{sectors.length} setores ativos no workspace</p></div></div>{!sectorFormOpen && <button type="button" className="settings-save" onClick={() => { setSectorDraft(EMPTY_SECTOR); setSectorFormOpen(true); }}><Plus size={16} /> Novo setor</button>}</div>
                    {sectorFormOpen && (
                    <form onSubmit={saveSector} className="settings-entity-form">
                        <label className="settings-field"><span>Nome</span><input value={sectorDraft.name} onChange={(event) => setSectorDraft({ ...sectorDraft, name: event.target.value })} placeholder="Ex.: Cozinha" required autoFocus /></label>
                        <label className="settings-field"><span>Chave do sistema</span><input value={sectorDraft.system_key} onChange={(event) => setSectorDraft({ ...sectorDraft, system_key: event.target.value })} placeholder="Opcional" /></label>
                        <div className="settings-inline-actions"><button type="submit" className="settings-save" disabled={entitySaving}>{entitySaving ? <LoaderCircle size={15} className="is-spinning" /> : <Save size={15} />}{sectorDraft.id ? 'Atualizar' : 'Criar'}</button><button type="button" className="settings-system-row" onClick={() => { setSectorDraft(EMPTY_SECTOR); setSectorFormOpen(false); }}>Cancelar</button></div>
                    </form>
                    )}
                    <div className="settings-entity-list">{sectors.length === 0 ? <div className="settings-empty-note">Nenhum setor cadastrado. Crie o primeiro para classificar checklists.</div> : sectors.map((sector) => <article className="settings-entity-row" key={sector.id}><div><strong>{sector.name}</strong><small>{sector.system_key || 'Setor próprio'}</small></div><div className="settings-inline-actions"><button type="button" className="settings-icon-action" onClick={() => { setSectorDraft({ id: sector.id, name: sector.name || '', system_key: sector.system_key || '' }); setSectorFormOpen(true); }} aria-label={`Editar ${sector.name}`} title="Editar"><Pencil size={15} /></button><button type="button" className="settings-icon-action danger" onClick={() => archiveSector(sector)} aria-label={`Arquivar ${sector.name}`} title="Arquivar"><Archive size={15} /></button></div></article>)}</div>
                </section>
            )}

            {activeTab === 'users' && (
                <section className="settings-remote-panel settings-entity-panel">
                    <div className="settings-entity-toolbar">
                        <div className="settings-remote-section-heading"><span><UsersRound size={18} /></span><div><h2>Usuários</h2><p>{visibleUsers.length} de {users.length} usuários do workspace</p></div></div>
                        <button type="button" className="settings-save" onClick={() => setInviteOpen(true)}><UserPlus size={16} /> Novo usuário</button>
                    </div>
                    <div className="settings-user-controls">
                        <label className="settings-search-field">
                            <Search size={16} aria-hidden="true" />
                            <input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Buscar por nome ou e-mail..." aria-label="Buscar por nome ou e-mail" />
                        </label>
                        <div className="settings-user-tabs" role="tablist" aria-label="Filtro de usuários">
                            {[
                                ['all', `Todos ${users.length}`],
                                ['managers', `Gestores ${users.filter((member) => ['owner', 'admin', 'manager'].includes(String(member.role || '').toLocaleLowerCase())).length}`],
                                ['operators', `Operadores ${users.filter((member) => ['operator', 'employee', 'viewer'].includes(String(member.role || '').toLocaleLowerCase())).length}`],
                            ].map(([value, label]) => <button type="button" key={value} className={userScope === value ? 'is-active' : ''} onClick={() => setUserScope(value)} role="tab" aria-selected={userScope === value}>{label}</button>)}
                        </div>
                        <label className="settings-user-unit-filter">
                            Unidade
                            <select value={userUnitFilter} onChange={(event) => setUserUnitFilter(event.target.value)} aria-label="Filtrar usuários por unidade">
                                <option value="">Todas</option>
                                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                            </select>
                        </label>
                    </div>
                    {visibleUsers.length === 0 ? <div className="settings-empty-note">Nenhum usuário corresponde aos filtros atuais.</div> : <div className="settings-user-list">{visibleUsers.map((member) => { const draft = userDrafts[String(member.id)] || { role: member.role || 'operator' }; const currentUnits = Array.isArray(draft.managed_units) ? draft.managed_units : []; return <article className="settings-user-row" key={member.id}><div><strong>{member.name || member.email}</strong><small>{member.email || 'Sem e-mail'} · {member.execution_count || 0} execuções</small></div><select value={draft.role} onChange={(event) => updateUserDraft(member, 'role', event.target.value)} aria-label={`Papel de ${member.name || member.email}`}>{[...new Set([...ROLE_OPTIONS, draft.role])].map((role) => <option key={role} value={role}>{role}</option>)}</select><select multiple value={currentUnits.map(String)} onChange={(event) => updateUserDraft(member, 'managed_units', Array.from(event.target.selectedOptions, (option) => option.value))} aria-label={`Unidades de ${member.name || member.email}`}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><button type="button" className="settings-save" onClick={() => saveUser(member)} disabled={entitySaving}><Save size={15} /> Salvar</button></article>; })}</div>}
                </section>
            )}

            {activeTab === 'credits' && (
                <section className="settings-remote-panel settings-entity-panel">
                    <div className="settings-remote-section-heading"><span><SettingsIcon size={18} /></span><div><h2>Créditos IA</h2><p>Saldo retornado pelo workspace remoto</p></div></div>
                    {!credits ? <div className="settings-empty-note">Carteira de créditos ainda não configurada.</div> : <div className="settings-credit-grid"><div><span>Incluídos</span><strong>{credits.included_credits}</strong></div><div><span>Comprados</span><strong>{credits.purchased_credits}</strong></div><div><span>Consumidos</span><strong>{credits.consumed_credits}</strong></div><div><span>Disponíveis</span><strong>{credits.available_credits}</strong></div></div>}
                </section>
            )}

            {activeTab === 'billing' && (
                <section className="settings-remote-panel settings-entity-panel">
                    <div className="settings-remote-section-heading"><span><SettingsIcon size={18} /></span><div><h2>Financeiro</h2><p>Informações de cobrança retornadas pelo workspace</p></div></div>
                    {!billing ? <div className="settings-empty-note">Dados financeiros ainda não configurados.</div> : <div className="settings-billing-grid"><div><span>Plano</span><strong>{billing.plan_name || '-'}</strong></div><div><span>Status</span><strong>{billing.status || '-'}</strong></div><div><span>Valor</span><strong>{billing.amount_cents == null ? '-' : `${billing.currency || 'BRL'} ${(billing.amount_cents / 100).toFixed(2)}`}</strong></div><div><span>Fim do período</span><strong>{billing.period_end ? new Date(billing.period_end).toLocaleDateString('pt-BR') : '-'}</strong></div></div>}
                </section>
            )}

            {activeTab === 'api' && (
                <form onSubmit={saveApi} className="settings-remote-grid">
                    <section className="settings-remote-panel">
                        <div className="settings-remote-section-heading"><span><SettingsIcon size={18} /></span><div><h2>API e integrações</h2><p>Endpoints públicos configurados para este workspace</p></div></div>
                        <label className="settings-field"><span>Endpoint base</span><input type="url" value={apiDraft.endpoint_url} onChange={(event) => setApiDraft({ ...apiDraft, endpoint_url: event.target.value })} placeholder="https://..." /></label>
                        <label className="settings-field"><span>Webhook</span><input type="url" value={apiDraft.webhook_url} onChange={(event) => setApiDraft({ ...apiDraft, webhook_url: event.target.value })} placeholder="https://..." /></label>
                        <label className="settings-field"><span>Chave pública</span><input value={apiDraft.public_key} onChange={(event) => setApiDraft({ ...apiDraft, public_key: event.target.value })} placeholder="Não armazene segredo aqui" /></label>
                        <div className="settings-account-meta"><Shield size={16} /><span>Segredos de integração não são exibidos nem persistidos nesta tela.</span></div>
                    </section>
                    <div className="settings-remote-actions"><button type="submit" className="settings-save" disabled={saving}>{saving ? <LoaderCircle size={17} className="is-spinning" /> : <Save size={17} />}{saving ? 'Salvando…' : 'Salvar API'}</button></div>
                </form>
            )}

            {inviteOpen && (
                <div className="settings-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setInviteOpen(false); }}>
                    <form className="settings-dialog" onSubmit={inviteUser} role="dialog" aria-modal="true" aria-labelledby="invite-user-title">
                        <div className="settings-dialog-header">
                            <div><p className="remote-eyebrow">Acesso ao workspace</p><h2 id="invite-user-title">Adicionar novo usuário</h2></div>
                            <button type="button" className="settings-icon-action" onClick={() => setInviteOpen(false)} aria-label="Fechar novo usuário">×</button>
                        </div>
                        <label className="settings-field"><span>Nome completo</span><input value={inviteDraft.name} onChange={(event) => setInviteDraft({ ...inviteDraft, name: event.target.value })} required /></label>
                        <label className="settings-field"><span>E-mail</span><input type="email" value={inviteDraft.email} onChange={(event) => setInviteDraft({ ...inviteDraft, email: event.target.value })} placeholder="nome@empresa.com" required /></label>
                        <label className="settings-field"><span>Perfil de acesso</span><select value={inviteDraft.role} onChange={(event) => setInviteDraft({ ...inviteDraft, role: event.target.value })}>{ROLE_OPTIONS.filter((role) => role !== 'owner').map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
                        <label className="settings-field"><span>Unidades vinculadas</span><select multiple value={inviteDraft.managed_units.map(String)} onChange={(event) => setInviteDraft({ ...inviteDraft, managed_units: Array.from(event.target.selectedOptions, (option) => option.value) })}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
                        <p className="settings-dialog-help"><Mail size={15} /> O convite será enviado pelo backend autenticado do Supabase; a sessão atual do gestor não será substituída.</p>
                        <div className="settings-inline-actions settings-dialog-actions"><button type="button" className="settings-system-row" onClick={() => setInviteOpen(false)}>Cancelar</button><button type="submit" className="settings-save" disabled={inviteBusy}>{inviteBusy ? <LoaderCircle size={15} className="is-spinning" /> : <UserPlus size={15} />}{inviteBusy ? 'Enviando…' : 'Enviar convite'}</button></div>
                    </form>
                </div>
            )}

            <div className="settings-remote-footer"><button type="button" className="settings-logout" onClick={logout}><LogOut size={17} /> Sair da conta</button></div>
        </div>
    );
};

export default ConfigurationsRemote;
