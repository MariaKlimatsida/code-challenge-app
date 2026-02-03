import { Link } from 'react-router-dom';
import '../styles/global.css';
import Navbar from '../components/Navbar';

function Home() {
    return (
        <div className="page-container">
            <Navbar />
            <header className="hero">
                <h1>Verbeter je programmeervaardigheden met leuke challenges!</h1>
                <p>Leren programmeren was nog nooit zo leuk en gestructureerd. Doe mee aan uitdagingen die passen bij jouw niveau en groei als developer!</p>
                <div className="cta-buttons">
                    <Link to="/login" className="btn">Nu starten met coderen</Link>
                    <Link to="/challenges" className="btn">Bekijk Challenges</Link>
                </div>
            </header>
        </div>
    );
}

export default Home;
