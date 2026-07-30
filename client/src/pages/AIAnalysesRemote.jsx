import { useEffect, useState } from 'react';
import { Bot, LoaderCircle, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { parityService } from '../services/checklistProducaoService';

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
        // The loader owns async state synchronization for the remote filters.
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <div className="min-h-full bg-[#f7f9fc] p-7 text-[#252c39] max-[700px]:p-5">
            <header className="mb-[22px] flex items-start justify-between gap-[18px] max-[700px]:flex-col">
                <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.13em] text-[#087d70]">Evidências remotas</p><h1 className="m-0 text-[30px] font-extrabold tracking-[-0.03em] max-[700px]:text-[26px]">Análises IA</h1><p className="m-0 mt-2 text-[#70788a]">Resultados de análise vinculados às evidências do workspace.</p></div>
                <button type="button" className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-[#dfe3ea] bg-white px-3 text-sm text-[#4f5b6e] transition-colors hover:border-[#9bcfc7] hover:text-[#087d70] disabled:cursor-not-allowed disabled:opacity-55 max-[700px]:w-full" onClick={loadAnalyses} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar</button>
            </header>
            <div className="mb-[18px] grid grid-cols-4 gap-3 max-[800px]:grid-cols-2">
                <div className="grid gap-2 rounded-xl border border-[#e8eaf0] bg-white p-[17px]"><span className="text-xs text-[#70788a]">Análises</span><strong className="text-[25px]">{analyses.length}</strong></div>
                <div className="grid gap-2 rounded-xl border border-[#e8eaf0] bg-white p-[17px]"><span className="text-xs text-[#70788a]">Alertas</span><strong className="text-[25px]">{alerts}</strong></div>
                <div className="grid gap-2 rounded-xl border border-[#e8eaf0] bg-white p-[17px]"><span className="text-xs text-[#70788a]">Falhas</span><strong className="text-[25px]">{failed}</strong></div>
                <div className="grid gap-2 rounded-xl border border-[#e8eaf0] bg-white p-[17px]"><span className="text-xs text-[#70788a]">Score médio</span><strong className="text-[25px]">{averageScore == null ? '-' : averageScore}</strong></div>
            </div>
            <section className="mb-[18px] rounded-xl border border-[#e8eaf0] bg-white p-[18px]">
                <div className="mb-4 flex items-center gap-2.5 max-[700px]:flex-col max-[700px]:items-stretch"><div className="flex min-h-[38px] flex-1 items-center gap-2 rounded-lg border border-[#dfe3ea] px-2.5 text-[#7c8492] focus-within:border-[#1f6feb]"><Search size={16} /><input className="min-h-[30px] w-full border-0 bg-transparent text-sm text-[#2e3645] outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar evidência" /></div><select className="min-h-[38px] rounded-lg border border-[#dfe3ea] bg-white px-2.5 text-sm text-[#2e3645] outline-none" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar status"><option value="">Todos os status</option><option value="pending">Pendente</option><option value="completed">Concluída</option><option value="failed">Falha</option></select></div>
                {loading ? <div className="grid justify-items-center gap-2 px-[18px] py-[46px] text-center text-[#70788a]"><LoaderCircle size={22} className="animate-spin" /> Carregando análises remotas…</div> : error ? <div className="flex flex-col items-center justify-center gap-3 px-[18px] py-[46px] text-center text-[#b42318]">{error}<button type="button" className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-[#dfe3ea] bg-white px-3 text-sm text-[#4f5b6e]" onClick={loadAnalyses}>Tentar novamente</button></div> : analyses.length === 0 ? <div className="grid justify-items-center gap-2 px-[18px] py-[46px] text-center text-[#70788a]"><Bot size={28} /><strong className="text-[#303847]">Nenhuma análise IA encontrada</strong><span>As análises aparecerão quando uma evidência processada estiver disponível.</span></div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse"><thead><tr><th className="border-b border-[#f0f1f4] px-2.5 py-[13px] text-left text-[11px] uppercase text-[#70788a]">Evidência</th><th className="border-b border-[#f0f1f4] px-2.5 py-[13px] text-left text-[11px] uppercase text-[#70788a]">Status</th><th className="border-b border-[#f0f1f4] px-2.5 py-[13px] text-left text-[11px] uppercase text-[#70788a]">Score</th><th className="border-b border-[#f0f1f4] px-2.5 py-[13px] text-left text-[11px] uppercase text-[#70788a]">Alerta</th><th className="border-b border-[#f0f1f4] px-2.5 py-[13px] text-left text-[11px] uppercase text-[#70788a]">Data</th></tr></thead><tbody>{analyses.map((analysis) => <tr key={analysis.id}><td className="grid gap-1 border-b border-[#f0f1f4] px-2.5 py-[13px] align-top text-[13px]"><strong>{analysis.summary || analysis.evidence_id || 'Evidência'}</strong><small className="text-xs text-[#70788a]">{analysis.response_id || 'Sem resposta vinculada'}</small></td><td className="border-b border-[#f0f1f4] px-2.5 py-[13px] align-top text-[13px]"><span className="inline-flex w-fit rounded-full bg-[#eef2f7] px-2 py-[3px] text-[11px] font-bold text-[#536074]">{analysis.status}</span></td><td className="border-b border-[#f0f1f4] px-2.5 py-[13px] align-top text-[13px]">{analysis.score == null ? '-' : analysis.score}</td><td className="border-b border-[#f0f1f4] px-2.5 py-[13px] align-top text-[13px]">{analysis.alert ? <span className="inline-flex items-center gap-1 text-[#b42318]"><ShieldAlert size={14} /> {analysis.alert}</span> : '-'}</td><td className="border-b border-[#f0f1f4] px-2.5 py-[13px] align-top text-[13px]">{analysis.created_at ? new Date(analysis.created_at).toLocaleString('pt-BR') : '-'}</td></tr>)}</tbody></table></div>}
            </section>
        </div>
    );
};

export default AIAnalysesRemote;
