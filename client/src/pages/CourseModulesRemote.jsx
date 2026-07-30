import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronDown, ChevronRight, Clock3, LoaderCircle, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { parityService } from '../services/checklistProducaoService';

const lessonContentToText = (content) => {
    if (content == null) return '';

    if (typeof content === 'string') {
        const value = content.trim();
        if (!value) return '';

        try {
            return lessonContentToText(JSON.parse(value));
        } catch {
            return value;
        }
    }

    if (Array.isArray(content)) {
        return content.map(lessonContentToText).filter(Boolean).join('\n\n');
    }

    if (typeof content === 'object') {
        if (Array.isArray(content.blocks)) {
            return content.blocks
                .map((block) => lessonContentToText(
                    block?.content
                    ?? block?.text
                    ?? block?.value
                    ?? block?.data?.content
                    ?? block?.data?.text
                ))
                .filter(Boolean)
                .join('\n\n');
        }

        return lessonContentToText(
            content.content
            ?? content.text
            ?? content.value
            ?? content.description
        );
    }

    return String(content);
};

const CourseModulesRemote = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [course, setCourse] = useState(null);
    const [modules, setModules] = useState([]);
    const [openModules, setOpenModules] = useState({});
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [workingLesson, setWorkingLesson] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadContent = async () => {
        try {
            setLoading(true);
            setError('');
            const [courses, content] = await Promise.all([parityService.getCourses(), parityService.getCourseContent(id)]);
            setCourse((courses || []).find((item) => String(item.id) === String(id)) || null);
            const nextModules = content || [];
            setModules(nextModules);
            setSelectedLesson(nextModules.flatMap((module) => module.lessons || [])[0] || null);
            setOpenModules(Object.fromEntries(nextModules.map((module, index) => [String(module.id), index === 0])));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o conteúdo do curso.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(loadContent);
        // Course id is the remote content key.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const allLessons = useMemo(() => modules.flatMap((module) => module.lessons || []), [modules]);
    const completedLessons = allLessons.filter((lesson) => Number(lesson.progress?.progress_percent || 0) >= 100).length;
    const completion = allLessons.length ? Math.round((completedLessons / allLessons.length) * 100) : 0;

    const completeLesson = async (lesson) => {
        if (Number(lesson.progress?.progress_percent || 0) >= 100) return;
        try {
            setWorkingLesson(String(lesson.id));
            const progress = await parityService.updateLessonProgress(lesson.id, { progress_percent: 100 });
            setModules((current) => current.map((module) => ({
                ...module,
                lessons: (module.lessons || []).map((item) => item.id === lesson.id ? { ...item, progress } : item),
            })));
            setSelectedLesson((current) => current?.id === lesson.id ? { ...current, progress } : current);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o progresso da aula.');
        } finally {
            setWorkingLesson('');
        }
    };

    if (loading) return <div className="min-h-screen bg-[#f6fafb] px-4 py-8 text-operation-ink sm:px-6 lg:px-8"><div className="flex min-h-[300px] items-center justify-center gap-3 text-sm text-operation-muted"><LoaderCircle size={22} className="animate-spin" /> Carregando conteúdo remoto…</div></div>;
    if (error) return <div className="min-h-screen bg-[#f6fafb] px-4 py-8 text-operation-ink sm:px-6 lg:px-8"><div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-16 text-center text-sm text-red-700" role="alert">{error}<button type="button" className="rounded-xl border border-red-200 bg-white px-3.5 py-2 font-semibold text-red-700 hover:bg-red-100" onClick={loadContent}>Tentar novamente</button></div></div>;

    return (
        <div className="min-h-screen bg-[#f6fafb] px-4 py-8 text-operation-ink sm:px-6 lg:px-8">
            <header className="mx-auto mb-8 flex max-w-7xl flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><button type="button" className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-operation-mint-dark transition-colors hover:bg-operation-soft" onClick={() => navigate('/courses')}><ArrowLeft size={16} /> Cursos</button><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-operation-mint-dark">Conteúdo do curso</p><h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{course?.title || 'Curso'}</h1><p className="mt-2 text-sm text-operation-muted">{modules.length} módulos · {allLessons.length} aulas · {completion}% concluído</p></div><button type="button" className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-operation-line bg-white px-3.5 py-2 text-sm font-semibold transition-colors hover:border-operation-mint hover:bg-operation-soft md:self-auto" onClick={loadContent}><RefreshCw size={16} /> Atualizar</button></header>
            <main className="mx-auto max-w-7xl">
            {modules.length === 0 ? <section className="rounded-2xl border border-dashed border-operation-line bg-white px-6 py-16"><div className="flex flex-col items-center justify-center gap-3 text-center text-sm text-operation-muted"><BookOpen size={30} /><strong className="text-base text-operation-ink">Este curso ainda não tem módulos publicados</strong><span>O conteúdo será exibido quando for carregado no workspace.</span></div></section> : <div className="grid gap-4">{modules.map((module) => { const isOpen = Boolean(openModules[String(module.id)]); const lessons = module.lessons || []; return <section className="overflow-hidden rounded-2xl border border-operation-line bg-white shadow-[0_12px_30px_rgba(23,49,58,0.06)]" key={module.id}><button type="button" className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-operation-soft/40" onClick={() => setOpenModules((current) => ({ ...current, [String(module.id)]: !isOpen }))}><span className="flex min-w-0 items-center gap-3">{isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}<span className="grid min-w-0 gap-1"><strong className="truncate">{module.title}</strong><small className="text-xs text-operation-muted">{lessons.length} aulas</small></span></span><span className="shrink-0 text-sm font-semibold text-operation-muted">{lessons.filter((lesson) => Number(lesson.progress?.progress_percent || 0) >= 100).length}/{lessons.length}</span></button>{isOpen && <div className="grid gap-2 border-t border-operation-line p-3">{lessons.map((lesson) => { const complete = Number(lesson.progress?.progress_percent || 0) >= 100; return <button type="button" className={'flex w-full items-center justify-between gap-4 rounded-xl p-3 text-left transition-colors hover:bg-operation-soft disabled:cursor-wait disabled:opacity-60 ' + (complete ? 'bg-operation-soft' : '')} key={lesson.id} onClick={() => setSelectedLesson(lesson)} disabled={workingLesson === String(lesson.id)}><span className="flex min-w-0 items-center gap-3">{complete ? <CheckCircle2 size={17} className="shrink-0 text-operation-mint-dark" /> : <BookOpen size={17} className="shrink-0 text-operation-muted" />}<span className="grid min-w-0 gap-1"><strong className="truncate text-sm">{lesson.title}</strong><small className="truncate text-xs text-operation-muted">{lesson.description || 'Abrir conteúdo'}{lesson.duration_seconds ? ` · ${Math.ceil(lesson.duration_seconds / 60)} min` : ''}</small></span></span><span className="shrink-0 text-operation-muted">{workingLesson === String(lesson.id) ? <LoaderCircle size={16} className="animate-spin" /> : <Clock3 size={16} />}</span></button>; })}</div>}</section>; })}</div>}
            {selectedLesson && <section className="mt-6 rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)]" aria-label="Conteúdo da aula">
                <div className="flex flex-col gap-5 border-b border-operation-line pb-5 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-operation-mint-dark">Aula selecionada</p>
                        <h2 className="text-2xl font-semibold tracking-[-0.035em]">{selectedLesson.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-operation-muted">{selectedLesson.description || 'Sem descrição cadastrada.'}</p>
                    </div>
                    {Number(selectedLesson.progress?.progress_percent || 0) >= 100
                        ? <span className="inline-flex items-center gap-2 rounded-full bg-operation-soft px-3 py-1.5 text-xs font-semibold text-operation-mint-dark"><CheckCircle2 size={15} /> Concluída</span>
                        : <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-operation-ink px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-operation-mint-dark disabled:cursor-wait disabled:opacity-60" onClick={() => completeLesson(selectedLesson)} disabled={workingLesson === String(selectedLesson.id)}>
                            {workingLesson === String(selectedLesson.id) ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            Marcar como concluída
                        </button>}
                </div>
                {selectedLesson.content
                    ? <div className="mt-5 whitespace-pre-wrap rounded-xl bg-[#f6fafb] p-5 text-sm leading-7 text-operation-ink">
                        {lessonContentToText(selectedLesson.content) || 'Este conteúdo ainda não possui um formato de leitura disponível.'}
                    </div>
                    : <div className="mt-5 rounded-xl border border-dashed border-operation-line px-4 py-8 text-center text-sm text-operation-muted">O conteúdo desta aula ainda não foi carregado no workspace.</div>}
            </section>}
            </main>
        </div>
    );
};

export default CourseModulesRemote;
