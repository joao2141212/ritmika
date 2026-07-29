import { useState } from 'react';
// JSX runtime usage is not recognized by the project's no-unused-vars rule.
// eslint-disable-next-line no-unused-vars
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { resolvePostLoginPath } from '../lib/accessRouting';
import '../styles/login.css'; // Will create this next

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const result = await login(email.trim(), password);
            if (result.success) {
                navigate(resolvePostLoginPath(result.user), { replace: true });
            } else {
                const message = String(result.error || '');
                setError(/invalid login credentials/i.test(message)
                    ? 'Email ou senha não conferem. Revise os dados e tente novamente.'
                    : message || 'Não foi possível entrar agora. Tente novamente.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="login-page">
            <motion.section
                className="login-showcase"
                initial={reduceMotion ? false : { opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                aria-label="Sobre o Ritmika"
            >
                <div className="login-brand login-brand-inverse">
                    <span className="login-brand-mark"><Zap size={21} fill="currentColor" /></span>
                    <span>Ritmika</span>
                </div>

                <div className="login-showcase-copy">
                    <p className="login-eyebrow">Operação em um só ritmo</p>
                    <h1>Rotinas claras.<br />Equipes alinhadas.</h1>
                    <p className="login-showcase-lead">
                        Organize checklists, acompanhe a execução e transforme o dia a dia de qualquer estabelecimento em uma operação previsível.
                    </p>

                    <ul className="login-benefits">
                        <li><CheckCircle2 size={18} /> Processos padronizados sem complicação</li>
                        <li><CheckCircle2 size={18} /> Visibilidade por unidade, setor e equipe</li>
                        <li><CheckCircle2 size={18} /> Evidências e indicadores em tempo real</li>
                    </ul>
                </div>

                <div className="login-showcase-note">
                    <span className="login-live-dot" aria-hidden="true" />
                    <div><strong>Operação conectada</strong><small>Da abertura ao fechamento, tudo no mesmo lugar.</small></div>
                </div>
                <div className="login-orbit login-orbit-one" aria-hidden="true" />
                <div className="login-orbit login-orbit-two" aria-hidden="true" />
            </motion.section>

            <motion.section
                className="login-panel"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="login-brand login-brand-mobile">
                    <span className="login-brand-mark"><Zap size={20} fill="currentColor" /></span>
                    <span>Ritmika</span>
                </div>

                <header className="login-welcome">
                    <p className="login-eyebrow">Acesso ao workspace</p>
                    <h2>Bem-vindo de volta</h2>
                    <p>Entre com as credenciais fornecidas pela sua empresa.</p>
                </header>

                {error && (
                    <div className="login-alert" role="alert" aria-live="polite">
                        {error}
                    </div>
                )}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="login-field">
                        <label htmlFor="login-email">Email</label>
                        <div className="login-input-shell">
                            <Mail size={19} aria-hidden="true" />
                            <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="voce@empresa.com.br" required disabled={isSubmitting} />
                        </div>
                    </div>

                    <div className="login-field">
                        <label htmlFor="login-password">Senha</label>
                        <div className="login-input-shell">
                            <LockKeyhole size={19} aria-hidden="true" />
                            <input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Digite sua senha" required disabled={isSubmitting} />
                            <button type="button" className="login-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword}>
                                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="login-submit" disabled={isSubmitting}>
                        <span>{isSubmitting ? 'Entrando…' : 'Entrar no Ritmika'}</span>
                        {!isSubmitting && <ArrowRight size={19} aria-hidden="true" />}
                    </button>
                </form>

                <footer className="login-help">
                    <p>Não possui acesso?</p>
                    <span>Solicite suas credenciais ao administrador da empresa.</span>
                </footer>
            </motion.section>
        </main>
    );
};

export default Login;
