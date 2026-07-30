import { createElement, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { logger } from '../lib/logger';
import { settingsService } from '../services/checklistProducaoService';
import {
    User,
    Bell,
    Moon,
    Smartphone,
    LogOut,
    Save,
    RefreshCw,
    Trash2,
    Shield,
    ChevronRight,
    Settings as SettingsIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const SettingsSection = ({ title, icon: SectionIcon, children }) => (
    <div
        className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)]"
    >
        <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-operation-soft text-operation-mint-dark">
                {createElement(SectionIcon, { size: 20 })}
            </div>
            <h2 className="font-semibold">{title}</h2>
        </div>
        <div className="grid gap-4">
            {children}
        </div>
    </div>
);

const Toggle = ({ label, checked, onChange }) => (
    <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-operation-line py-4 first:pt-0 last:border-b-0">
        <span className="text-sm font-semibold">{label}</span>
        <div className="relative">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-operation-mint-dark peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-operation-mint">
                <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </div>
        </div>
    </label>
);

const Settings = () => {
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(false);

    // Local State for form
    const [profile, setProfile] = useState({
        name: user?.name || 'Pedro Duarte',
        email: user?.email || 'pedro@ritmika.com',
        phone: '+55 11 99999-9999'
    });

    const [preferences, setPreferences] = useState({
        pushNotifications: true,
        emailDigest: false,
        darkMode: false,
        soundEffects: true
    });

    useEffect(() => {
        let active = true;

        const loadSettings = async () => {
            try {
                setLoading(true);
                const data = await settingsService.get();
                if (!active) return;
                setProfile({
                    name: data.profile?.name || user?.name || '',
                    email: data.profile?.email || user?.email || '',
                    phone: data.profile?.phone || '',
                });
                setPreferences((current) => ({ ...current, ...(data.profile?.preferences || {}) }));
                logger.info({
                    file: 'client/src/pages/Settings.jsx',
                    function: 'Settings.loadSettings',
                    operation: 'settings.load',
                    status: 'success',
                    userId: user?.id,
                });
            } catch (loadError) {
                logger.error({
                    file: 'client/src/pages/Settings.jsx',
                    function: 'Settings.loadSettings',
                    operation: 'settings.load',
                    errorCode: 'SETTINGS_LEGACY_LOAD_FAILED',
                    userId: user?.id,
                    error: loadError,
                });
                toast.error(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as configurações.');
            } finally {
                if (active) setLoading(false);
            }
        };

        loadSettings();
        return () => { active = false; };
    }, [user?.email, user?.id, user?.name]);

    const handleSaveProfile = async () => {
        try {
            setLoading(true);
            await settingsService.updateProfile({
                name: profile.name.trim(),
                phone: profile.phone.trim(),
                preferences,
            });
            await settingsService.updateWorkspaceSettings({
                settings: {
                    interface: preferences.darkMode ? 'dark' : 'light',
                    preferences,
                },
            });
            logger.info({
                file: 'client/src/pages/Settings.jsx',
                function: 'Settings.handleSaveProfile',
                operation: 'settings.profile.save',
                status: 'success',
                userId: user?.id,
            });
            toast.success('Perfil atualizado com sucesso!');
        } catch (saveError) {
            logger.error({
                file: 'client/src/pages/Settings.jsx',
                function: 'Settings.handleSaveProfile',
                operation: 'settings.profile.save',
                errorCode: 'SETTINGS_PROFILE_SAVE_FAILED',
                userId: user?.id,
                error: saveError,
            });
            toast.error(saveError instanceof Error ? saveError.message : 'Não foi possível atualizar o perfil.');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        const toastId = toast.loading('Sincronizando dados...');
        try {
            const data = await settingsService.get();
            setProfile({
                name: data.profile?.name || user?.name || '',
                email: data.profile?.email || user?.email || '',
                phone: data.profile?.phone || '',
            });
            setPreferences((current) => ({ ...current, ...(data.profile?.preferences || {}) }));
            logger.info({
                file: 'client/src/pages/Settings.jsx',
                function: 'Settings.handleSync',
                operation: 'settings.sync',
                status: 'success',
                userId: user?.id,
            });
            toast.success('Tudo atualizado!', { id: toastId });
        } catch (syncError) {
            logger.error({
                file: 'client/src/pages/Settings.jsx',
                function: 'Settings.handleSync',
                operation: 'settings.sync',
                errorCode: 'SETTINGS_SYNC_FAILED',
                userId: user?.id,
                error: syncError,
            });
            toast.error(syncError instanceof Error ? syncError.message : 'Não foi possível sincronizar as configurações.', { id: toastId });
        }
    };

    const handleClearCache = () => {
        if (window.confirm('Isso apagará dados offline não salvos. Continuar?')) {
            localStorage.clear();
            logger.info({
                file: 'client/src/pages/Settings.jsx',
                function: 'Settings.handleClearCache',
                operation: 'settings.cache.clear',
                status: 'success',
            });
            window.location.reload();
        }
    };

    return (
        <div className="min-h-screen bg-[#f6fafb] px-4 py-8 text-operation-ink sm:px-6 lg:px-8">
            <header className="mx-auto mb-8 max-w-5xl">
                <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Configurações</h1>
                <p className="mt-2 text-sm text-operation-muted">Gerencie sua conta e preferências do aplicativo</p>
            </header>

            <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
                {/* Profile Section */}
                <SettingsSection title="Perfil" icon={User}>
                    <div className="mb-6 flex items-center gap-4">
                        <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-operation-ink text-xl font-bold text-white">
                            {profile.name.charAt(0)}
                            <div className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-operation-mint text-operation-ink">
                                <User size={14} />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold">{profile.name}</h3>
                            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-operation-soft px-2.5 py-1 text-xs font-semibold text-operation-mint-dark"><Shield size={12} /> {user?.role || 'Admin'}</span>
                        </div>
                    </div>

                    <div className="grid gap-2 text-sm font-semibold">
                        <label>Nome Completo</label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={e => setProfile({ ...profile, name: e.target.value })}
                            className="rounded-xl border border-operation-line px-3 py-2.5 text-sm font-normal outline-none focus:border-operation-mint focus:ring-4 focus:ring-operation-mint/15"
                        />
                    </div>
                    <div className="grid gap-2 text-sm font-semibold">
                        <label>Email</label>
                        <input
                            type="email"
                            value={profile.email}
                            onChange={e => setProfile({ ...profile, email: e.target.value })}
                            className="rounded-xl border border-operation-line px-3 py-2.5 text-sm font-normal outline-none focus:border-operation-mint focus:ring-4 focus:ring-operation-mint/15"
                        />
                    </div>
                    <div className="grid gap-2 text-sm font-semibold">
                        <label>Telefone</label>
                        <input
                            type="tel"
                            value={profile.phone}
                            onChange={e => setProfile({ ...profile, phone: e.target.value })}
                            className="rounded-xl border border-operation-line px-3 py-2.5 text-sm font-normal outline-none focus:border-operation-mint focus:ring-4 focus:ring-operation-mint/15"
                        />
                    </div>

                    <button
                        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-operation-ink px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-operation-mint-dark disabled:cursor-wait disabled:opacity-60"
                        onClick={handleSaveProfile}
                        disabled={loading}
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </SettingsSection>

                {/* Preferences Section */}
                <div className="grid gap-5">
                    <SettingsSection title="Preferências" icon={SettingsIcon}>
                        <Toggle
                            label="Notificações Push"
                            checked={preferences.pushNotifications}
                            onChange={v => setPreferences({ ...preferences, pushNotifications: v })}
                        />
                        <Toggle
                            label="Resumo por Email"
                            checked={preferences.emailDigest}
                            onChange={v => setPreferences({ ...preferences, emailDigest: v })}
                        />
                        <Toggle
                            label="Efeitos Sonoros"
                            checked={preferences.soundEffects}
                            onChange={v => setPreferences({ ...preferences, soundEffects: v })}
                        />
                    </SettingsSection>

                    <SettingsSection title="Dados e Sistema" icon={Smartphone}>
                        <div className="flex cursor-pointer items-center justify-between gap-4 border-b border-operation-line py-4" onClick={handleSync}>
                            <div>
                                <span className="block text-sm font-semibold">Sincronização</span>
                                <span className="mt-1 block text-xs text-operation-muted">Última sync: Há 2 min</span>
                            </div>
                            <button type="button" className="rounded-lg border border-operation-line p-2 text-operation-muted transition-colors hover:border-operation-mint hover:bg-operation-soft" aria-label="Sincronizar"><RefreshCw size={18} /></button>
                        </div>

                        <div className="flex cursor-pointer items-center justify-between gap-4 py-4 text-red-700" onClick={handleClearCache}>
                            <div>
                                <span className="block text-sm font-semibold">Limpar Cache</span>
                                <span className="mt-1 block text-xs text-red-600/70">Corrige problemas de carregamento</span>
                            </div>
                            <button type="button" className="rounded-lg border border-red-200 p-2 text-red-700" aria-label="Limpar cache"><Trash2 size={18} /></button>
                        </div>
                    </SettingsSection>

                    <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl border border-operation-line px-4 py-3 text-sm font-semibold transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700" onClick={logout}>
                        <LogOut size={20} />
                        Sair da Conta
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
