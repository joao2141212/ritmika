import { useEffect, useState } from 'react';
import { Bot, LoaderCircle, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { parityService } from '../services/checklistProducaoService';
import '../styles/parity-pages.css';

const AIAnalysesRemote = () => {
    const [analyses, setAnalyses] = useState([]);
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadAnalyses = async () => {
        try {
            setLoading(true);
            setError('');
            setAnalyses(await parityService.getAiAnalyses({ status, search }));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as análises IA.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnalyses();
        // Status and search are the remote filters for this page.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, search]);

    const averageScore = analyses.length
        ? Math.round(analyses.reduce((total, item) => total + Number(item.score || 0), 0) / analyses.length)
        : null;
    const alerts = analyses.filter((item) => item.alert).length;
    const failed = analyses.filter((item) => ['failed', 'error'].includes(item.status)).length;

    return (
        <div className="parity-page ritmika-light-mode">
            <header className="parity-header">
                <div><p className="remote-eyebrow">Evidências remotas</p><h1>Análises IA</h1><p>Resultados de análise vinculados às evidências do workspace.</p></div>
                <button type="button" className="parity-button" onClick={loadAnalyses} disabled={loading}><RefreshCw size={16} /> Atualizar</button>
            </header>
            <div className="parity-stat-grid">
                <div><span>Análises</span><strong>{analyses.length}</strong></div>
                <div><span>Alertas</span><strong>{alerts}</strong></div>
                <div><span>Falhas</span><strong>{failed}</strong></div>
                <div><span>Score médio</span><strong>{averageScore == null ? '-' : averageScore}</strong></div>
            </div>
            <section className="parity-panel">
                <div className="parity-toolbar"><div className="parity-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar evidência" /></div><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar status"><option value="">Todos os status</option><option value="pending">Pendente</option><option value="completed">Concluída</option><option value="failed">Falha</option></select></div>
                {loading ? <div className="parity-state"><LoaderCircle size={22} className="is-spinning" /> Carregando análises remotas…</div> : error ? <div className="parity-state parity-error">{error}<button type="button" className="parity-button" onClick={loadAnalyses}>Tentar novamente</button></div> : analyses.length === 0 ? <div className="parity-state"><Bot size={28} /><strong>Nenhuma análise IA encontrada</strong><span>As análises aparecerão quando uma evidência processada estiver disponível.</span></div> : <div className="parity-table-wrap"><table className="parity-table"><thead><tr><th>Evidência</th><th>Status</th><th>Score</th><th>Alerta</th><th>Data</th></tr></thead><tbody>{analyses.map((analysis) => <tr key={analysis.id}><td><strong>{analysis.summary || analysis.evidence_id || 'Evidência'}</strong><small>{analysis.response_id || 'Sem resposta vinculada'}</small></td><td><span className="parity-badge">{analysis.status}</span></td><td>{analysis.score == null ? '-' : analysis.score}</td><td>{analysis.alert ? <span className="parity-alert"><ShieldAlert size={14} /> {analysis.alert}</span> : '-'}</td><td>{analysis.created_at ? new Date(analysis.created_at).toLocaleString('pt-BR') : '-'}</td></tr>)}</tbody></table></div>}
            </section>
        </div>
    );
};

export default AIAnalysesRemote;
