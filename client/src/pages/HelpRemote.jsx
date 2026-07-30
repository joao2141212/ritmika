import { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, HelpCircle, LoaderCircle, MessageCircle, Mail, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { parityService } from '../services/checklistProducaoService';

const DEFAULT_TUTORIALS = [
    { title: 'Dashboard', description: 'Acompanhe execução, atrasos, conclusão e rankings do workspace.', route: '/' },
    { title: 'Configurações', description: 'Cadastre unidades e setores e ajuste preferências remotas.', route: '/configurations' },
    { title: 'Checklists', description: 'Crie modelos, atribua referências e acompanhe o histórico.', route: '/checklists' },
    { title: 'Notificações', description: 'Filtre eventos, marque leituras e abra a rota relacionada.', route: '/notifications' },
];

const DEFAULT_FAQ = [
    { question: 'Como criar um checklist?', answer: 'Abra Checklists, escolha Novo Checklist, adicione os itens e avance para publicar.' },
    { question: 'Onde cadastro uma unidade ou setor?', answer: 'Acesse Configurações e use as abas Unidades ou Setores. Os dados são gravados no workspace remoto.' },
    { question: 'Como acompanho uma notificação?', answer: 'Abra Notificações, aplique os filtros e use a ação de abrir quando o evento tiver uma rota.' },
];

const HelpRemote = () => {
    const [support, setSupport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        parityService.getSupportSettings()
            .then((data) => { if (active) setSupport(data); })
            .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o suporte remoto.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const tutorials = Array.isArray(support?.tutorials) && support.tutorials.length ? support.tutorials : DEFAULT_TUTORIALS;
    const faq = Array.isArray(support?.faq) && support.faq.length ? support.faq : DEFAULT_FAQ;
    const fallbackTutorial = tutorials.find((tutorial) => tutorial.route) || null;

    return (
        <div className="min-h-screen bg-[#f6fafb] px-4 py-8 text-operation-ink sm:px-6 lg:px-8">
            <header className="mx-auto mb-8 flex max-w-5xl flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-operation-mint-dark">Suporte do workspace</p><h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Central de Ajuda</h1><p className="mt-2 text-sm text-operation-muted">Guias operacionais e canais configurados para este workspace.</p></div>{loading && <LoaderCircle size={22} className="animate-spin text-operation-muted" />}</header>
            <main className="mx-auto grid max-w-5xl gap-5">{error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">O conteúdo de suporte não pôde ser carregado: {error}</div>}
            <section className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)]"><MessageCircle size={22} className="text-operation-mint-dark" /><h2 className="mt-4 text-lg font-semibold">WhatsApp</h2>{support?.whatsapp_url ? <a className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-operation-mint-dark hover:underline" href={support.whatsapp_url} target="_blank" rel="noreferrer">Abrir canal de suporte <ExternalLink size={14} /></a> : <div><p className="mt-3 text-sm leading-6 text-operation-muted">Este canal ainda não foi configurado. Peça a uma pessoa administradora para ativá-lo.</p>{fallbackTutorial && <Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-operation-mint-dark hover:underline" to={fallbackTutorial.route}>Ver guia disponível <PlayCircle size={14} /></Link>}</div>}</div><div className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)]"><Mail size={22} className="text-operation-mint-dark" /><h2 className="mt-4 text-lg font-semibold">E-mail</h2>{support?.email ? <a className="mt-3 inline-block text-sm font-semibold text-operation-mint-dark hover:underline" href={`mailto:${support.email}`}>{support.email}</a> : <div><p className="mt-3 text-sm leading-6 text-operation-muted">O e-mail de suporte ainda não foi configurado. Peça a uma pessoa administradora para adicioná-lo.</p>{fallbackTutorial && <Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-operation-mint-dark hover:underline" to={fallbackTutorial.route}>Ver guia disponível <PlayCircle size={14} /></Link>}</div>}</div></section>
            <section className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)]"><div className="mb-5 flex items-center gap-3"><BookOpen size={20} className="text-operation-mint-dark" /><div><h2 className="font-semibold">Tutoriais</h2><p className="mt-1 text-xs text-operation-muted">Atalhos para os fluxos disponíveis no app.</p></div></div><div className="grid gap-3">{tutorials.map((tutorial) => <Link className="flex items-center gap-3 rounded-xl border border-operation-line p-4 transition-colors hover:border-operation-mint hover:bg-operation-soft" to={tutorial.route || '#'} key={tutorial.title}><PlayCircle size={22} className="shrink-0 text-operation-mint-dark" /><div className="min-w-0 flex-1"><h2 className="font-semibold">{tutorial.title}</h2><p className="mt-1 text-sm text-operation-muted">{tutorial.description}</p></div><ExternalLink size={16} className="shrink-0 text-operation-muted" /></Link>)}</div></section>
            <section className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)]"><div className="mb-5 flex items-center gap-3"><HelpCircle size={20} className="text-operation-mint-dark" /><div><h2 className="font-semibold">Perguntas frequentes</h2><p className="mt-1 text-xs text-operation-muted">Respostas rápidas para a operação.</p></div></div><div className="grid gap-2">{faq.map((item) => <details className="rounded-xl border border-operation-line px-4 py-3" key={item.question}><summary className="cursor-pointer text-sm font-semibold">{item.question}</summary><p className="mt-3 text-sm leading-6 text-operation-muted">{item.answer}</p></details>)}</div></section></main>
        </div>
    );
};

export default HelpRemote;
