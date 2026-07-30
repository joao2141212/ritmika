import { useState } from 'react';
// JSX runtime usage is not recognized by the project's no-unused-vars rule.
// eslint-disable-next-line no-unused-vars
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { resolvePostLoginPath } from '../lib/accessRouting';

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
        <main className="grid min-h-screen bg-[#f6fafb] text-operation-ink lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
            <motion.section
                className="relative hidden overflow-hidden bg-operation-ink p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-16"
                initial={reduceMotion ? false : { opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                aria-label="Sobre o Ritmika"
            >
                <div className="relative z-10 flex items-center gap-3 text-xl font-bold tracking-[-0.03em]">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-operation-mint text-operation-ink shadow-[0_10px_30px_rgba(118,215,190,0.25)]"><Zap size={21} fill="currentColor" /></span>
                    <span>Ritmika</span>
                </div>

                <div className="relative z-10 max-w-xl">
                    <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-operation-mint">Operação em um só ritmo</p>
                    <h1 className="max-w-lg text-5xl font-semibold leading-[1.02] tracking-[-0.055em] xl:text-6xl">Rotinas claras.<br />Equipes alinhadas.</h1>
                    <p className="mt-7 max-w-lg text-lg leading-8 text-white/70">
                        Organize checklists, acompanhe a execução e transforme o dia a dia de qualquer estabelecimento em uma operação previsível.
                    </p>

                    <ul className="mt-10 grid gap-4 text-sm text-white/80">
                        <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-operation-mint" /> Processos padronizados sem complicação</li>
                        <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-operation-mint" /> Visibilidade por unidade, setor e equipe</li>
                        <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-operation-mint" /> Evidências e indicadores em tempo real</li>
                    </ul>
                </div>

                <div className="relative z-10 flex items-center gap-3 border-t border-white/15 pt-6 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full bg-operation-mint shadow-[0_0_0_6px_rgba(118,215,190,0.12)]" aria-hidden="true" />
                    <div className="flex flex-col gap-1"><strong>Operação conectada</strong><small className="text-white/55">Da abertura ao fechamento, tudo no mesmo lugar.</small></div>
                </div>
                <div className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full border border-operation-mint/20" aria-hidden="true" />
                <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full border border-white/10" aria-hidden="true" />
            </motion.section>

            <motion.section
                className="flex min-w-0 flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="mb-12 flex items-center gap-3 text-xl font-bold tracking-[-0.03em] lg:hidden">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-operation-mint text-operation-ink"><Zap size={20} fill="currentColor" /></span>
                    <span>Ritmika</span>
                </div>

                <header className="mb-8">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-operation-mint-dark">Acesso ao workspace</p>
                    <h2 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Bem-vindo de volta</h2>
                    <p className="mt-3 text-sm leading-6 text-operation-muted">Entre com as credenciais fornecidas pela sua empresa.</p>
                </header>

                {error && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700" role="alert" aria-live="polite">
                        {error}
                    </div>
                )}

                <form className="grid gap-5" onSubmit={handleSubmit}>
                    <div className="grid gap-2">
                        <label className="text-sm font-semibold" htmlFor="login-email">Email</label>
                        <div className="flex items-center gap-3 rounded-xl border border-operation-line bg-white px-4 py-3 transition-colors focus-within:border-operation-mint focus-within:ring-4 focus-within:ring-operation-mint/15">
                            <Mail size={19} aria-hidden="true" />
                            <input className="min-w-0 flex-1 !appearance-none !border-0 !bg-transparent p-0 text-sm text-operation-ink !outline-none !shadow-none focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none focus-visible:!outline-none placeholder:text-operation-muted/70" id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="voce@empresa.com.br" required disabled={isSubmitting} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-semibold" htmlFor="login-password">Senha</label>
                        <div className="flex items-center gap-3 rounded-xl border border-operation-line bg-white px-4 py-3 transition-colors focus-within:border-operation-mint focus-within:ring-4 focus-within:ring-operation-mint/15">
                            <LockKeyhole size={19} aria-hidden="true" />
                            <input className="min-w-0 flex-1 !appearance-none !border-0 !bg-transparent p-0 text-sm text-operation-ink !outline-none !shadow-none focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none focus-visible:!outline-none placeholder:text-operation-muted/70" id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Digite sua senha" required disabled={isSubmitting} />
                            <button type="button" className="rounded-lg p-1 text-operation-muted transition-colors hover:bg-operation-soft hover:text-operation-ink" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword}>
                                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="mt-2 flex min-h-12 items-center justify-center gap-3 rounded-xl bg-operation-ink px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(23,49,58,0.16)] transition-all hover:-translate-y-0.5 hover:bg-operation-mint-dark disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting}>
                        <span>{isSubmitting ? 'Entrando…' : 'Entrar no Ritmika'}</span>
                        {!isSubmitting && <ArrowRight size={19} aria-hidden="true" />}
                    </button>
                </form>

                <footer className="mt-8 border-t border-operation-line pt-6 text-center text-sm">
                    <p className="font-semibold">Não possui acesso?</p>
                    <span className="mt-1 block text-operation-muted">Solicite suas credenciais ao administrador da empresa.</span>
                </footer>
            </motion.section>
        </main>
    );
};

export default Login;
