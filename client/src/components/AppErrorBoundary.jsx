import { Component } from 'react';
import { logger } from '../lib/logger';
import '../styles/app-error-boundary.css';

const chunkFailurePattern = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Expected a JavaScript-or-Wasm module script/i;

class AppErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null, diagnosis: null };
    }

    static getDerivedStateFromError(error) {
        return {
            error,
            diagnosis: chunkFailurePattern.test(error?.message || '') ? 'checking_chunk' : 'render_failure',
        };
    }

    componentDidCatch(error, info) {
        const message = error?.message || String(error || '');
        const assetUrl = message.match(/https?:\/\/[^\s)]+\/assets\/[^\s)]+\.js(?:\?[^\s)]*)?/i)?.[0] || null;
        const sameOriginAsset = assetUrl
            ? new URL(assetUrl, window.location.href).origin === window.location.origin
            : false;
        const chunkCandidate = chunkFailurePattern.test(message) && sameOriginAsset;
        const telemetry = {
            file: 'client/src/components/AppErrorBoundary.jsx',
            function: 'AppErrorBoundary.componentDidCatch',
            operation: 'render_application',
            route: window.location.pathname,
            assetUrl,
            chunkCandidate,
            error,
            componentStack: info.componentStack,
        };

        if (!chunkCandidate) {
            logger.error({ ...telemetry, errorCode: 'REACT_RENDER_FAILURE', diagnosis: 'application_bug' });
            return;
        }

        logger.warn({
            ...telemetry,
            errorCode: 'CHUNK_LOAD_DIAGNOSIS_STARTED',
            diagnosis: 'checking_asset_availability',
        });

        fetch(assetUrl, { method: 'HEAD', cache: 'no-store' })
            .then((response) => {
                const staleDeployment = response.status === 404 || response.status === 410;
                this.setState({ diagnosis: staleDeployment ? 'stale_deployment' : 'chunk_load_failure' });
                const event = {
                    ...telemetry,
                    errorCode: staleDeployment ? 'STALE_CHUNK_CONFIRMED' : 'CHUNK_LOAD_FAILURE',
                    diagnosis: staleDeployment ? 'published_asset_no_longer_exists' : 'asset_exists_but_module_failed',
                    assetHttpStatus: response.status,
                    recoveryRecommendation: staleDeployment ? 'reload_latest_build' : 'inspect_runtime_network_or_module_error',
                };
                if (staleDeployment) logger.warn(event);
                else logger.error(event);
            })
            .catch((probeError) => {
                this.setState({ diagnosis: 'chunk_probe_failed' });
                logger.error({
                    ...telemetry,
                    errorCode: 'CHUNK_ASSET_PROBE_FAILED',
                    diagnosis: 'network_or_cors_prevented_classification',
                    probeError,
                    recoveryRecommendation: 'inspect_connectivity_and_original_module_error',
                });
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
        const { error, diagnosis } = this.state;
        if (!error) return this.props.children;

        const staleChunk = diagnosis === 'stale_deployment';
        const checkingChunk = diagnosis === 'checking_chunk';
        const chunkLoadFailure = diagnosis === 'chunk_load_failure' || diagnosis === 'chunk_probe_failed';
        return (
            <main className="app-recovery" role="alert" aria-live="assertive">
                <section className="app-recovery-card">
                    <div className="app-recovery-mark" aria-hidden="true">R</div>
                    <p className="app-recovery-eyebrow">Recuperação do aplicativo</p>
                    <h1>
                        {staleChunk
                            ? 'Há uma atualização pronta'
                            : checkingChunk
                                ? 'Verificando o carregamento desta tela'
                                : 'Não foi possível abrir esta tela'}
                    </h1>
                    <p>
                        {staleChunk
                            ? 'A versão aberta ficou desatualizada durante uma publicação. Seus dados continuam salvos.'
                            : checkingChunk
                                ? 'Estamos distinguindo uma publicação recente de uma falha do aplicativo. Seus dados continuam salvos.'
                                : chunkLoadFailure
                                    ? 'O módulo não carregou, mas não há confirmação de uma atualização. O diagnóstico detalhado foi registrado no console.'
                                    : 'O Ritmika preservou sua sessão e interrompeu esta tela para evitar um estado incompleto.'}
                    </p>
                    <div className="app-recovery-actions">
                        <button type="button" className="app-recovery-primary" onClick={this.retry}>
                            Recarregar e tentar novamente
                        </button>
                        <button type="button" className="app-recovery-secondary" onClick={this.returnToLogin}>
                            Voltar ao login
                        </button>
                    </div>
                    <small>
                        Código: {staleChunk
                            ? 'STALE_CHUNK_CONFIRMED'
                            : checkingChunk
                                ? 'CHUNK_DIAGNOSIS_PENDING'
                                : chunkLoadFailure
                                    ? 'CHUNK_LOAD_FAILURE'
                                    : 'REACT_RENDER_FAILURE'}
                    </small>
                </section>
            </main>
        );
    }
}

export default AppErrorBoundary;
