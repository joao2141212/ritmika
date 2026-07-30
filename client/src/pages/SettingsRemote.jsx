import { useEffect, useState } from 'react';
import { Bell, Check, LoaderCircle, LogOut, RefreshCw, Settings as SettingsIcon, Shield, Smartphone, Trash2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { settingsService } from '../services/checklistProducaoService';
import { logger } from '../lib/logger';

const DEFAULT_PREFERENCES = {
    pushNotifications: true,
    emailDigest: false,
    soundEffects: true,
};

const SettingsRemote = () => {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const loadSettings = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await settingsService.get();
            setProfile({
                name: data.profile?.name || user?.name || '',
                email: data.profile?.email || user?.email || '',
                phone: data.profile?.phone || '',
            });
            setPreferences({ ...DEFAULT_PREFERENCES, ...(data.profile?.preferences || {}) });
        } catch (loadError) {
            logger.error({
                file: 'client/src/pages/SettingsRemote.jsx',
                function: 'SettingsRemote.loadSettings',
                operation: 'settings.load',
                errorCode: 'SETTINGS_LOAD_FAILED',
                userId: user?.id,
                error: loadError,
            });
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as configurações.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(loadSettings);
    // Load once for the authenticated workspace; manual refresh calls the same loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveSettings = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            await settingsService.updateProfile({
                name: profile.name.trim(),
                phone: profile.phone.trim(),
                preferences,
            });
            await settingsService.updateWorkspaceSettings({
                settings: { interface: 'white', preferences },
            });
            toast.success('Configurações salvas.');
        } catch (saveError) {
            logger.error({
                file: 'client/src/pages/SettingsRemote.jsx',
                function: 'SettingsRemote.saveSettings',
                operation: 'settings.save',
                errorCode: 'SETTINGS_SAVE_FAILED',
                userId: user?.id,
                error: saveError,
            });
            toast.error(saveError instanceof Error ? saveError.message : 'Não foi possível salvar as configurações.');
        } finally {
            setSaving(false);
        }
    };

    const clearCache = () => {
        if (window.confirm('Isso apagará apenas dados locais não sincronizados. Continuar?')) {
            window.localStorage.clear();
            logger.info({
                file: 'client/src/pages/SettingsRemote.jsx',
                function: 'SettingsRemote.clearCache',
                operation: 'settings.cache.clear',
                status: 'success',
                userId: user?.id,
            });
            toast.success('Dados locais limpos.');
        }
    };

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center gap-3 bg-[#f6fafb] px-6 text-sm text-operation-muted"><LoaderCircle size={22} className="animate-spin" /> Carregando configurações…</div>;
    }

    if (error) {
        return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f6fafb] px-6 text-center text-sm text-red-700" role="alert"><span>{error}</span><button type="button" className="rounded-xl border border-red-200 bg-white px-3.5 py-2 font-semibold hover:bg-red-100" onClick={loadSettings}>Tentar novamente</button></div>;
    }

    return (
        <div className="min-h-screen bg-[#f6fafb] px-4 py-8 text-operation-ink sm:px-6 lg:px-8">
            <header className="mx-auto mb-8 flex max-w-5xl flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-operation-mint-dark">Workspace remoto</p>
                    <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Configurações</h1>
                    <p className="mt-2 text-sm text-operation-muted">Preferências persistidas no perfil e no workspace do Ritmika.</p>
                </div>
                <span className="inline-flex items-center gap-2 self-start rounded-full bg-operation-soft px-3 py-1.5 text-xs font-semibold text-operation-mint-dark md:self-auto"><Check size={15} /> White mode ativo</span>
            </header>

            <form onSubmit={saveSettings} className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
                <section className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)]">
                    <div className="mb-6 flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-operation-soft text-operation-mint-dark"><User size={18} /></span>
                        <div><h2 className="font-semibold">Perfil</h2><p className="mt-1 text-xs text-operation-muted">Dados da conta autenticada</p></div>
                    </div>
                    <label className="mb-4 grid gap-2 text-sm font-semibold">
                        <span>Nome completo</span>
                        <input className="rounded-xl border border-operation-line px-3 py-2.5 text-sm font-normal outline-none focus:border-operation-mint focus:ring-4 focus:ring-operation-mint/15" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required />
                    </label>
                    <label className="mb-4 grid gap-2 text-sm font-semibold">
                        <span>E-mail</span>
                        <input className="rounded-xl border border-operation-line bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none" value={profile.email} readOnly />
                    </label>
                    <label className="mb-5 grid gap-2 text-sm font-semibold">
                        <span>Telefone</span>
                        <input className="rounded-xl border border-operation-line px-3 py-2.5 text-sm font-normal outline-none focus:border-operation-mint focus:ring-4 focus:ring-operation-mint/15" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="Opcional" />
                    </label>
                    <div className="flex items-center gap-2 border-t border-operation-line pt-4 text-xs text-operation-muted">
                        <Shield size={16} />
                        <span>{user?.role || 'Usuário'} · dados protegidos por RLS</span>
                    </div>
                </section>

                <section className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)]">
                    <div className="mb-6 flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-operation-soft text-operation-mint-dark"><SettingsIcon size={18} /></span>
                        <div><h2 className="font-semibold">Preferências</h2><p className="mt-1 text-xs text-operation-muted">Comportamento da operação</p></div>
                    </div>
                    <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-operation-line py-4 first:pt-0">
                        <span><Bell size={17} /><span><strong>Notificações</strong><small>Mostrar alertas do workspace</small></span></span>
                        <input className="h-4 w-4 accent-[#0b6b61]" type="checkbox" checked={preferences.pushNotifications} onChange={(event) => setPreferences({ ...preferences, pushNotifications: event.target.checked })} />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-operation-line py-4">
                        <span><Smartphone size={17} /><span><strong>Resumo por e-mail</strong><small>Receber resumo operacional</small></span></span>
                        <input className="h-4 w-4 accent-[#0b6b61]" type="checkbox" checked={preferences.emailDigest} onChange={(event) => setPreferences({ ...preferences, emailDigest: event.target.checked })} />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-operation-line py-4">
                        <span><RefreshCw size={17} /><span><strong>Efeitos sonoros</strong><small>Feedback de ações concluídas</small></span></span>
                        <input className="h-4 w-4 accent-[#0b6b61]" type="checkbox" checked={preferences.soundEffects} onChange={(event) => setPreferences({ ...preferences, soundEffects: event.target.checked })} />
                    </label>
                    <div className="flex items-center justify-between gap-4 py-4">
                        <span><Check size={17} /><span><strong>Tema visual</strong><small>Interface branca padronizada</small></span></span>
                        <strong>White</strong>
                    </div>
                </section>

                <section className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)] md:col-span-2">
                    <div className="mb-6 flex items-center gap-3">
                        <span><Smartphone size={18} /></span>
                        <div><h2 className="font-semibold">Dados e sistema</h2><p className="mt-1 text-xs text-operation-muted">Controles locais e sessão</p></div>
                    </div>
                    <button type="button" className="flex w-full items-center gap-3 border-b border-operation-line py-4 text-left transition-colors hover:text-operation-mint-dark" onClick={loadSettings}>
                        <span><RefreshCw size={17} /><span><strong>Sincronizar preferências</strong><small>Recarregar os dados do workspace</small></span></span>
                    </button>
                    <button type="button" className="flex w-full items-center gap-3 border-b border-operation-line py-4 text-left text-red-700 transition-colors hover:text-red-800" onClick={clearCache}>
                        <span><Trash2 size={17} /><span><strong>Limpar dados locais</strong><small>Remove somente rascunhos não sincronizados</small></span></span>
                    </button>
                    <button type="button" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-operation-line px-3.5 py-2.5 text-sm font-semibold text-operation-ink transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700" onClick={logout}>
                        <LogOut size={17} /> Sair da conta
                    </button>
                </section>

                <div className="flex justify-end md:col-span-2">
                    <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-operation-ink px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-operation-mint-dark disabled:cursor-wait disabled:opacity-60" disabled={saving}>
                        {saving ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}
                        {saving ? 'Salvando…' : 'Salvar alterações'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsRemote;
