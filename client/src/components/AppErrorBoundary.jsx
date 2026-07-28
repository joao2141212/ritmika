import { Component } from 'react';
import { logger } from '../lib/logger';
import '../styles/app-error-boundary.css';

const chunkFailurePattern = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Expected a JavaScript-or-Wasm module script/i;

class AppErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        logger.error({
            file: 'client/src/components/AppErrorBoundary.jsx',
            function: 'AppErrorBoundary.componentDidCatch',
            operation: 'render_application',
            errorCode: chunkFailurePattern.test(error?.message || '') ? 'STALE_CHUNK' : 'REACT_RENDER_FAILURE',
            error,
            componentStack: info.componentStack,
        });
    }

    retry = () => {
        sessionStorage.removeItem('ritmika:chunk-reload-at');
        window.location.reload();
    };

    returnToLogin = () => {
        window.location.assign('/login?recovery=1');
    };

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;

        const staleChunk = chunkFailurePattern.test(error.message || '');
        return (
            <main className="app-recovery" role="alert" aria-live="assertive">
                <section className="app-recovery-card">
                    <div className="app-recovery-mark" aria-hidden="true">R</div>
                    <p className="app-recovery-eyebrow">Recuperação do aplicativo</p>
                    <h1>{staleChunk ? 'Há uma atualização pronta' : 'Não foi possível abrir esta tela'}</h1>
                    <p>
                        {staleChunk
                            ? 'A versão aberta ficou desatualizada durante uma publicação. Seus dados continuam salvos.'
                            : 'O Ritmika preservou sua sessão e interrompeu esta tela para evitar um estado incompleto.'}
                    </p>
                    <div className="app-recovery-actions">
                        <button type="button" className="app-recovery-primary" onClick={this.retry}>
                            Atualizar e tentar novamente
                        </button>
                        <button type="button" className="app-recovery-secondary" onClick={this.returnToLogin}>
                            Voltar ao login
                        </button>
                    </div>
                    <small>Código: {staleChunk ? 'STALE_CHUNK' : 'REACT_RENDER_FAILURE'}</small>
                </section>
            </main>
        );
    }
}

export default AppErrorBoundary;
