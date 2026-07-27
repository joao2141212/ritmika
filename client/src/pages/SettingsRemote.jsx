import { useEffect, useState } from 'react';
import { Bell, Check, LoaderCircle, LogOut, RefreshCw, Settings as SettingsIcon, Shield, Smartphone, Trash2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { settingsService } from '../services/checklistProducaoService';
import '../styles/settings-remote.css';

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
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as configurações.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
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
            toast.error(saveError instanceof Error ? saveError.message : 'Não foi possível salvar as configurações.');
        } finally {
            setSaving(false);
        }
    };

    const clearCache = () => {
        if (window.confirm('Isso apagará apenas dados locais não sincronizados. Continuar?')) {
            window.localStorage.clear();
            toast.success('Dados locais limpos.');
        }
    };

    if (loading) {
        return <div className="settings-remote-state"><LoaderCircle size={22} className="is-spinning" /> Carregando configurações…</div>;
    }

    if (error) {
        return <div className="settings-remote-state settings-remote-error"><span>{error}</span><button type="button" onClick={loadSettings}>Tentar novamente</button></div>;
    }

    return (
        <div className="settings-remote ritmika-light-mode">
            <header className="settings-remote-header">
                <div>
                    <p className="remote-eyebrow">Workspace remoto</p>
                    <h1>Configurações</h1>
                    <p>Preferências persistidas no perfil e no workspace do Ritmika.</p>
                </div>
                <span className="settings-theme-badge"><Check size={15} /> White mode ativo</span>
            </header>

            <form onSubmit={saveSettings} className="settings-remote-grid">
                <section className="settings-remote-panel">
                    <div className="settings-remote-section-heading">
                        <span><User size={18} /></span>
                        <div><h2>Perfil</h2><p>Dados da conta autenticada</p></div>
                    </div>
                    <label className="settings-field">
                        <span>Nome completo</span>
                        <input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required />
                    </label>
                    <label className="settings-field">
                        <span>E-mail</span>
                        <input value={profile.email} readOnly />
                    </label>
                    <label className="settings-field">
                        <span>Telefone</span>
                        <input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="Opcional" />
                    </label>
                    <div className="settings-account-meta">
                        <Shield size={16} />
                        <span>{user?.role || 'Usuário'} · dados protegidos por RLS</span>
                    </div>
                </section>

                <section className="settings-remote-panel">
                    <div className="settings-remote-section-heading">
                        <span><SettingsIcon size={18} /></span>
                        <div><h2>Preferências</h2><p>Comportamento da operação</p></div>
                    </div>
                    <label className="settings-toggle-row">
                        <span><Bell size={17} /><span><strong>Notificações</strong><small>Mostrar alertas do workspace</small></span></span>
                        <input type="checkbox" checked={preferences.pushNotifications} onChange={(event) => setPreferences({ ...preferences, pushNotifications: event.target.checked })} />
                    </label>
                    <label className="settings-toggle-row">
                        <span><Smartphone size={17} /><span><strong>Resumo por e-mail</strong><small>Receber resumo operacional</small></span></span>
                        <input type="checkbox" checked={preferences.emailDigest} onChange={(event) => setPreferences({ ...preferences, emailDigest: event.target.checked })} />
                    </label>
                    <label className="settings-toggle-row">
                        <span><RefreshCw size={17} /><span><strong>Efeitos sonoros</strong><small>Feedback de ações concluídas</small></span></span>
                        <input type="checkbox" checked={preferences.soundEffects} onChange={(event) => setPreferences({ ...preferences, soundEffects: event.target.checked })} />
                    </label>
                    <div className="settings-static-row">
                        <span><Check size={17} /><span><strong>Tema visual</strong><small>Interface branca padronizada</small></span></span>
                        <strong>White</strong>
                    </div>
                </section>

                <section className="settings-remote-panel settings-system-panel">
                    <div className="settings-remote-section-heading">
                        <span><Smartphone size={18} /></span>
                        <div><h2>Dados e sistema</h2><p>Controles locais e sessão</p></div>
                    </div>
                    <button type="button" className="settings-system-row" onClick={loadSettings}>
                        <span><RefreshCw size={17} /><span><strong>Sincronizar preferências</strong><small>Recarregar os dados do workspace</small></span></span>
                    </button>
                    <button type="button" className="settings-system-row danger" onClick={clearCache}>
                        <span><Trash2 size={17} /><span><strong>Limpar dados locais</strong><small>Remove somente rascunhos não sincronizados</small></span></span>
                    </button>
                    <button type="button" className="settings-logout" onClick={logout}>
                        <LogOut size={17} /> Sair da conta
                    </button>
                </section>

                <div className="settings-remote-actions">
                    <button type="submit" className="settings-save" disabled={saving}>
                        {saving ? <LoaderCircle size={17} className="is-spinning" /> : <Check size={17} />}
                        {saving ? 'Salvando…' : 'Salvar alterações'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsRemote;
