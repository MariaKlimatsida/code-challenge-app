import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';

function Navbar() {
    const { isAuthenticated, logout, user } = useAuth();
    const navigate = useNavigate();

    const isAdmin = (user?.roles || []).includes('admin');

    function handleLogout() {
        logout();
        navigate('/');
    }

    return (
        <div className="navbar-wrap">
            <nav className="navbar">
                <Link to="/" className="logo">Code Challenge App</Link>
                <div className="nav-links">
                    {isAuthenticated ? (
                        <>
                            {!isAdmin && <Link to="/challenges" className="btn">Challenges</Link>}
                            {!isAdmin && <Link to="/profile" className="btn">Profiel</Link>}
                            <button type="button" className="btn" onClick={handleLogout}>Uitloggen</button>
                        </>
                    ) : (
                        <>
                            <Link to="/challenges" className="btn">Challenges</Link>
                            <Link to="/login" className="btn">Inloggen</Link>
                        </>
                    )}
                </div>
            </nav>
        </div>
    );
}

export default Navbar;
