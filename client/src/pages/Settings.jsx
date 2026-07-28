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
import '../styles/settings.css';

const SettingsSection = ({ title, icon: SectionIcon, children }) => (
    <div
        className="settings-section glass-panel"
    >
        <div className="section-header">
            <div className="section-icon">
                {createElement(SectionIcon, { size: 20 })}
            </div>
            <h2>{title}</h2>
        </div>
        <div className="section-content">
            {children}
        </div>
    </div>
);

const Toggle = ({ label, checked, onChange }) => (
    <label className="setting-row toggle-row">
        <span className="setting-label">{label}</span>
        <div className="toggle-wrapper">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="toggle-input"
            />
            <div className="toggle-track">
                <div className="toggle-thumb" />
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
        darkMode: true,
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
        <div className="settings-container">
            <header className="page-header">
                <h1>Configurações</h1>
                <p>Gerencie sua conta e preferências do aplicativo</p>
            </header>

            <div className="settings-grid">
                {/* Profile Section */}
                <SettingsSection title="Perfil" icon={User}>
                    <div className="profile-header">
                        <div className="avatar-large">
                            {profile.name.charAt(0)}
                            <div className="avatar-edit-badge">
                                <User size={14} />
                            </div>
                        </div>
                        <div className="profile-info-display">
                            <h3>{profile.name}</h3>
                            <span className="role-badge"><Shield size={12} /> {user?.role || 'Admin'}</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Nome Completo</label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={e => setProfile({ ...profile, name: e.target.value })}
                            className="input-field"
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={profile.email}
                            onChange={e => setProfile({ ...profile, email: e.target.value })}
                            className="input-field"
                        />
                    </div>
                    <div className="form-group">
                        <label>Telefone</label>
                        <input
                            type="tel"
                            value={profile.phone}
                            onChange={e => setProfile({ ...profile, phone: e.target.value })}
                            className="input-field"
                        />
                    </div>

                    <button
                        className="btn-primary full-width"
                        onClick={handleSaveProfile}
                        disabled={loading}
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </SettingsSection>

                {/* Preferences Section */}
                <div className="right-column">
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
                        <div className="setting-row" onClick={handleSync}>
                            <div className="row-info">
                                <span className="setting-label">Sincronização</span>
                                <span className="setting-desc">Última sync: Há 2 min</span>
                            </div>
                            <button className="icon-action-btn"><RefreshCw size={18} /></button>
                        </div>

                        <div className="setting-row danger" onClick={handleClearCache}>
                            <div className="row-info">
                                <span className="setting-label">Limpar Cache</span>
                                <span className="setting-desc">Corrige problemas de carregamento</span>
                            </div>
                            <button className="icon-action-btn danger"><Trash2 size={18} /></button>
                        </div>
                    </SettingsSection>

                    <button className="logout-button-large" onClick={logout}>
                        <LogOut size={20} />
                        Sair da Conta
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
