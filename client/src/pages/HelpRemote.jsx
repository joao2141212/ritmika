import { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, HelpCircle, LoaderCircle, MessageCircle, Mail, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { parityService } from '../services/checklistProducaoService';
import '../styles/parity-pages.css';

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

    return (
        <div className="parity-page ritmika-light-mode">
            <header className="parity-header"><div><p className="remote-eyebrow">Suporte do workspace</p><h1>Central de Ajuda</h1><p>Guias operacionais e canais configurados para este workspace.</p></div>{loading && <LoaderCircle size={22} className="is-spinning" />}</header>
            {error && <div className="parity-inline-warning">O conteúdo de suporte não pôde ser carregado: {error}</div>}
            <section className="parity-contact-grid"><div className="parity-card"><MessageCircle size={22} /><h2>WhatsApp</h2>{support?.whatsapp_url ? <a href={support.whatsapp_url} target="_blank" rel="noreferrer">Abrir canal de suporte <ExternalLink size={14} /></a> : <p>Canal ainda não configurado neste workspace.</p>}</div><div className="parity-card"><Mail size={22} /><h2>E-mail</h2>{support?.email ? <a href={`mailto:${support.email}`}>{support.email}</a> : <p>E-mail de suporte ainda não configurado.</p>}</div></section>
            <section className="parity-panel"><div className="parity-section-heading"><BookOpen size={20} /><div><h2>Tutoriais</h2><p>Atalhos para os fluxos disponíveis no app.</p></div></div><div className="parity-card-grid">{tutorials.map((tutorial) => <Link className="parity-card parity-card-action" to={tutorial.route || '#'} key={tutorial.title}><PlayCircle size={22} /><div><h2>{tutorial.title}</h2><p>{tutorial.description}</p></div><ExternalLink size={16} /></Link>)}</div></section>
            <section className="parity-panel"><div className="parity-section-heading"><HelpCircle size={20} /><div><h2>Perguntas frequentes</h2><p>Respostas rápidas para a operação.</p></div></div><div className="parity-faq-list">{faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section>
        </div>
    );
};

export default HelpRemote;
