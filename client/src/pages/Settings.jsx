import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
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

const SettingsSection = ({ title, icon: Icon, children }) => (
    <motion.div
        className="settings-section glass-panel"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
    >
        <div className="section-header">
            <div className="section-icon">
                <Icon size={20} />
            </div>
            <h2>{title}</h2>
        </div>
        <div className="section-content">
            {children}
        </div>
    </motion.div>
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

    const handleSaveProfile = async () => {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
        toast.success('Perfil atualizado com sucesso!');
    };

    const handleSync = async () => {
        const toastId = toast.loading('Sincronizando dados...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success('Tudo atualizado!', { id: toastId });
    };

    const handleClearCache = () => {
        if (window.confirm('Isso apagará dados offline não salvos. Continuar?')) {
            localStorage.clear();
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
