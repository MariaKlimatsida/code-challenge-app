import '../styles/global.css';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../auth/useAuth.js';

function Login() {
    const navigate = useNavigate();
    const { login, isLoading, isAuthenticated, user } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const isAdmin = useMemo(() => {
        const roles = user?.roles || [];
        return Array.isArray(roles) && roles.includes('admin');
    }, [user]);

    if (isAuthenticated) return <Navigate to={isAdmin ? '/admin' : '/profile'} replace />;

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            const data = await login(email, password);
            const roles = data?.user?.roles || [];
            const nextIsAdmin = Array.isArray(roles) && roles.includes('admin');
            navigate(nextIsAdmin ? '/admin' : '/profile');
        } catch (err) {
            setError(err?.message || 'Inloggen mislukt');
        }
    }

    return (
        <div className="page-container">
            <Navbar />
            <div className="login-form">
                <h1>Inloggen</h1>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="email">E-mailadres</label>
                    <input
                        type="email"
                        id="email"
                        placeholder="Vul je e-mailadres in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <label htmlFor="password">Wachtwoord</label>
                    <input
                        type="password"
                        id="password"
                        placeholder="Vul je wachtwoord in"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {error && <p style={{ color: 'crimson' }}>{error}</p>}

                    <button type="submit" className="btn" disabled={isLoading}>
                        {isLoading ? 'Bezig...' : 'Inloggen'}
                    </button>
                </form>
                <p className="register-link">Heb je nog geen account? Vraag de admin om een account voor je aan te maken.</p>
            </div>
        </div>
    );
}

export default Login;