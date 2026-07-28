import { useState } from 'react';
import { Building2, Check, LoaderCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/workspace-selection.css';

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

    const handleSelect = async (workspaceId) => {
        setSubmittingId(workspaceId);
        setError('');
        const result = await selectWorkspace(workspaceId);
        if (!result?.success) {
            setError(result?.error || 'Não foi possível abrir esta empresa.');
            setSubmittingId('');
        }
    };

    return (
        <main className="workspace-selection-page">
            <section className="workspace-selection-card" aria-labelledby="workspace-selection-title">
                <div className="workspace-selection-mark"><Building2 size={24} /></div>
                <p className="workspace-selection-eyebrow">Empresa ativa</p>
                <h1 id="workspace-selection-title">Onde você quer trabalhar agora?</h1>
                <p className="workspace-selection-description">
                    Seus dados, permissões e unidades mudam conforme a empresa escolhida.
                </p>

                <div className="workspace-selection-options">
                    {(workspaceSelection?.options || []).map((option) => {
                        const workspace = option.workspace || {};
                        const isSubmitting = submittingId === option.workspace_id;
                        return (
                            <button
                                key={option.workspace_id}
                                type="button"
                                className="workspace-selection-option"
                                disabled={Boolean(submittingId)}
                                onClick={() => handleSelect(option.workspace_id)}
                            >
                                <span className="workspace-selection-icon"><Building2 size={20} /></span>
                                <span className="workspace-selection-copy">
                                    <strong>{workspace.name || 'Empresa sem nome'}</strong>
                                    <small>{roleLabels[String(option.role || '').toLowerCase()] || option.role || 'Membro'}</small>
                                </span>
                                <span className="workspace-selection-action">
                                    {isSubmitting ? <LoaderCircle size={19} className="is-spinning" /> : <Check size={19} />}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {error ? <p className="workspace-selection-error" role="alert">{error}</p> : null}

                <button type="button" className="workspace-selection-logout" onClick={logout}>
                    <LogOut size={16} /> Entrar com outra conta
                </button>
            </section>
        </main>
    );
};

export default WorkspaceSelection;
