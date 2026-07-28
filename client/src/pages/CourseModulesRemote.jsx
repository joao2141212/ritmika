import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronDown, ChevronRight, Clock3, LoaderCircle, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { parityService } from '../services/checklistProducaoService';
import '../styles/parity-pages.css';
import '../styles/course-parity.css';

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
        loadContent();
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

    if (loading) return <div className="parity-page ritmika-light-mode"><div className="parity-state"><LoaderCircle size={22} className="is-spinning" /> Carregando conteúdo remoto…</div></div>;
    if (error) return <div className="parity-page ritmika-light-mode"><div className="parity-state parity-error">{error}<button type="button" className="parity-button" onClick={loadContent}>Tentar novamente</button></div></div>;

    return (
        <div className="parity-page ritmika-light-mode">
            <header className="parity-header"><div><button type="button" className="parity-link-button" onClick={() => navigate('/courses')}><ArrowLeft size={16} /> Cursos</button><p className="remote-eyebrow">Conteúdo do curso</p><h1>{course?.title || 'Curso'}</h1><p>{modules.length} módulos · {allLessons.length} aulas · {completion}% concluído</p></div><button type="button" className="parity-button" onClick={loadContent}><RefreshCw size={16} /> Atualizar</button></header>
            {modules.length === 0 ? <section className="parity-panel"><div className="parity-state"><BookOpen size={30} /><strong>Este curso ainda não tem módulos publicados</strong><span>O conteúdo será exibido quando for carregado no workspace.</span></div></section> : <div className="parity-module-list">{modules.map((module) => { const isOpen = Boolean(openModules[String(module.id)]); const lessons = module.lessons || []; return <section className="parity-module" key={module.id}><button type="button" className="parity-module-head" onClick={() => setOpenModules((current) => ({ ...current, [String(module.id)]: !isOpen }))}><span>{isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}<span><strong>{module.title}</strong><small>{lessons.length} aulas</small></span></span><span>{lessons.filter((lesson) => Number(lesson.progress?.progress_percent || 0) >= 100).length}/{lessons.length}</span></button>{isOpen && <div className="parity-lesson-list">{lessons.map((lesson) => { const complete = Number(lesson.progress?.progress_percent || 0) >= 100; return <button type="button" className={'parity-lesson ' + (complete ? 'is-complete' : '')} key={lesson.id} onClick={() => setSelectedLesson(lesson)} disabled={workingLesson === String(lesson.id)}><span>{complete ? <CheckCircle2 size={17} /> : <BookOpen size={17} />}<span><strong>{lesson.title}</strong><small>{lesson.description || 'Abrir conteúdo'}{lesson.duration_seconds ? ` · ${Math.ceil(lesson.duration_seconds / 60)} min` : ''}</small></span></span><span>{workingLesson === String(lesson.id) ? <LoaderCircle size={16} className="is-spinning" /> : <Clock3 size={16} />}</span></button>; })}</div>}</section>; })}</div>}
            {selectedLesson && <section className="parity-panel parity-lesson-detail" aria-label="Conteúdo da aula">
                <div className="parity-lesson-detail-head">
                    <div>
                        <p className="remote-eyebrow">Aula selecionada</p>
                        <h2>{selectedLesson.title}</h2>
                        <p>{selectedLesson.description || 'Sem descrição cadastrada.'}</p>
                    </div>
                    {Number(selectedLesson.progress?.progress_percent || 0) >= 100
                        ? <span className="parity-status success"><CheckCircle2 size={15} /> Concluída</span>
                        : <button type="button" className="parity-button" onClick={() => completeLesson(selectedLesson)} disabled={workingLesson === String(selectedLesson.id)}>
                            {workingLesson === String(selectedLesson.id) ? <LoaderCircle size={16} className="is-spinning" /> : <CheckCircle2 size={16} />}
                            Marcar como concluída
                        </button>}
                </div>
                {selectedLesson.content
                    ? <div className="parity-lesson-content" style={{ whiteSpace: 'pre-wrap' }}>
                        {lessonContentToText(selectedLesson.content) || 'Este conteúdo ainda não possui um formato de leitura disponível.'}
                    </div>
                    : <div className="parity-state-inline">O conteúdo desta aula ainda não foi carregado no workspace.</div>}
            </section>}
        </div>
    );
};

export default CourseModulesRemote;
