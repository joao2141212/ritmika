import { useState } from 'react';
// JSX runtime usage is not recognized by the project's no-unused-vars rule.
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/login.css'; // Will create this next

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(email, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="login-container">
            <div className="login-background">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
            </div>

            <motion.div
                className="login-card glass-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="login-header">
                    <h1>Ritmika</h1>
                    <p>Operações gastronômicas no ritmo certo</p>
                </div>

                {error && (
                    <div className="error-message" role="alert" aria-live="polite">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="login-email">Email</label>
                        <input
                            id="login-email"
                            type="email"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="login-password">Senha</label>
                        <input
                            id="login-password"
                            type="password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary login-btn">
                        Entrar
                    </button>
                </form>

                <div className="login-footer">
                    <p>Ainda não tem conta? <a href="#">Fale com o suporte</a></p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
