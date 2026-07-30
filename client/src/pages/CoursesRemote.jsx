import { useEffect, useState } from 'react';
import { BookOpen, ChevronRight, LoaderCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { parityService } from '../services/checklistProducaoService';

const CoursesRemote = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadCourses = async () => {
        try {
            setLoading(true);
            setError('');
            setCourses(await parityService.getCourses());
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os cursos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(loadCourses);
    }, []);

    return (
        <div className="min-h-screen bg-[#f6fafb] px-4 py-8 text-operation-ink sm:px-6 lg:px-8">
            <header className="mx-auto mb-8 flex max-w-7xl flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-operation-mint-dark">Academia remota</p><h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Cursos</h1><p className="mt-2 text-sm text-operation-muted">Conteúdos e progresso de aprendizagem persistidos no workspace.</p></div><button type="button" className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-operation-line bg-white px-3.5 py-2 text-sm font-semibold transition-colors hover:border-operation-mint hover:bg-operation-soft disabled:cursor-wait disabled:opacity-60 md:self-auto" onClick={loadCourses} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar</button></header>
            <main className="mx-auto max-w-7xl">
                {loading ? <div className="flex items-center justify-center gap-3 rounded-2xl border border-operation-line bg-white px-6 py-16 text-sm text-operation-muted"><LoaderCircle size={22} className="animate-spin" /> Carregando cursos remotos…</div> : error ? <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-16 text-center text-sm text-red-700" role="alert">{error}<button type="button" className="rounded-xl border border-red-200 bg-white px-3.5 py-2 font-semibold text-red-700 hover:bg-red-100" onClick={loadCourses}>Tentar novamente</button></div> : courses.length === 0 ? <section className="rounded-2xl border border-dashed border-operation-line bg-white px-6 py-16"><div className="flex flex-col items-center justify-center gap-3 text-center text-sm text-operation-muted"><BookOpen size={30} /><strong className="text-base text-operation-ink">Nenhum curso publicado</strong><span>Quando um curso for cadastrado para este workspace, ele aparecerá aqui.</span></div></section> : <div className="grid gap-4 md:grid-cols-2">{courses.map((course) => <button type="button" className="group flex items-center gap-4 rounded-2xl border border-operation-line bg-white p-5 text-left shadow-[0_12px_30px_rgba(23,49,58,0.06)] transition-all hover:-translate-y-0.5 hover:border-operation-mint hover:shadow-[0_18px_40px_rgba(23,49,58,0.1)]" key={course.id} onClick={() => navigate(`/courses/${course.id}/modules`)}><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-operation-soft text-operation-mint-dark"><BookOpen size={22} /></div><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-semibold">{course.title}</h2><p className="mt-1 line-clamp-2 text-sm text-operation-muted">{course.description || 'Sem descrição cadastrada.'}</p><small className="mt-3 block text-xs font-semibold text-operation-mint-dark">{course.module_count || 0} módulos · {course.lesson_count || 0} aulas</small></div><ChevronRight size={19} className="shrink-0 text-operation-muted transition-transform group-hover:translate-x-1" /></button>)}</div>}
            </main>
        </div>
    );
};

export default CoursesRemote;
