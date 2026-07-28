import { useEffect, useState } from 'react';
import { BookOpen, ChevronRight, LoaderCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { parityService } from '../services/checklistProducaoService';
import '../styles/parity-pages.css';

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
        loadCourses();
    }, []);

    return (
        <div className="parity-page ritmika-light-mode">
            <header className="parity-header"><div><p className="remote-eyebrow">Academia remota</p><h1>Cursos</h1><p>Conteúdos e progresso de aprendizagem persistidos no workspace.</p></div><button type="button" className="parity-button" onClick={loadCourses} disabled={loading}><RefreshCw size={16} /> Atualizar</button></header>
            {loading ? <div className="parity-state"><LoaderCircle size={22} className="is-spinning" /> Carregando cursos remotos…</div> : error ? <div className="parity-state parity-error">{error}<button type="button" className="parity-button" onClick={loadCourses}>Tentar novamente</button></div> : courses.length === 0 ? <section className="parity-panel"><div className="parity-state"><BookOpen size={30} /><strong>Nenhum curso publicado</strong><span>Quando um curso for cadastrado para este workspace, ele aparecerá aqui.</span></div></section> : <div className="parity-card-grid">{courses.map((course) => <button type="button" className="parity-card parity-card-action" key={course.id} onClick={() => navigate(`/courses/${course.id}/modules`)}><div className="parity-card-icon"><BookOpen size={22} /></div><div><h2>{course.title}</h2><p>{course.description || 'Sem descrição cadastrada.'}</p><small>{course.module_count || 0} módulos · {course.lesson_count || 0} aulas</small></div><ChevronRight size={19} /></button>)}</div>}
        </div>
    );
};

export default CoursesRemote;
