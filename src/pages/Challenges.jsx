import { Link, Navigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import '../styles/global.css';
import './Challenges.css';
import { challenges as fallbackChallenges } from '../data/challenges';
import Navbar from '../components/Navbar';
import { listChallenges } from '../api/noviClient.js';
import { useAuth } from '../auth/useAuth.js';

function Challenges() {
    const { user, isAuthenticated } = useAuth();
    const isAdmin = useMemo(() => {
        const roles = user?.roles || [];
        return Array.isArray(roles) && roles.includes('admin');
    }, [user]);

    const [allChallenges, setAllChallenges] = useState(fallbackChallenges);
    const [search, setSearch] = useState('');

    const [selectedDifficulties, setSelectedDifficulties] = useState({
        beginner: false,
        intermediate: false,
        advanced: false,
    });

    useEffect(() => {
        let isCancelled = false;

        const normalizeDifficultyClass = (difficulty) => {
            const v = String(difficulty || '').toLowerCase();
            if (v.includes('beginner')) return 'beginner';
            if (v.includes('gemiddeld') || v.includes('intermediate')) return 'intermediate';
            if (v.includes('gevorderd') || v.includes('advanced')) return 'advanced';
            return 'beginner';
        };

        const normalizeId = (c) => {
            if (!c) return null;
            return String(c.id ?? c._id ?? c.challengeId ?? '');
        };

        async function load() {
            try {
                const fromApi = await listChallenges();
                const normalized = (Array.isArray(fromApi) ? fromApi : []).map((c) => {
                    const id = normalizeId(c);
                    return {
                        ...c,
                        id: id || c.id,
                        difficultyClass: c.difficultyClass || normalizeDifficultyClass(c.difficulty),
                    };
                }).filter((c) => c.id);

                if (!isCancelled && normalized.length > 0) setAllChallenges(normalized);
            } catch {
                // Fall back to local data
                if (!isCancelled) setAllChallenges(fallbackChallenges);
            }
        }

        load();
        return () => {
            isCancelled = true;
        };
    }, []);

    const filteredChallenges = useMemo(() => {
        const query = search.trim().toLowerCase();
        const activeFilters = Object.entries(selectedDifficulties)
            .filter(([, enabled]) => enabled)
            .map(([key]) => key);

        return allChallenges.filter((c) => {
            const matchesSearch =
                query.length === 0 ||
                c.title.toLowerCase().includes(query) ||
                c.description.toLowerCase().includes(query);

            const matchesDifficulty =
                activeFilters.length === 0 || activeFilters.includes(c.difficultyClass);

            return matchesSearch && matchesDifficulty;
        });
    }, [search, selectedDifficulties, allChallenges]);

    function toggleDifficulty(difficultyClass) {
        setSelectedDifficulties((prev) => ({
            ...prev,
            [difficultyClass]: !prev[difficultyClass],
        }));
    }

    if (isAuthenticated && isAdmin) return <Navigate to="/admin" replace />;

    return (
        <div className="page-container">
            <Navbar />
            <header className="challenges-header">
                <h1>Ontdek Code Challenges</h1>
                <input
                    type="text"
                    className="search-bar"
                    placeholder="Zoeken..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </header>
            <div className="challenges-content">
                <aside className="filters">
                    <h2>Filters</h2>
                    <label>
                        <input
                            type="checkbox"
                            checked={selectedDifficulties.beginner}
                            onChange={() => toggleDifficulty('beginner')}
                        />{' '}
                        Beginner
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={selectedDifficulties.intermediate}
                            onChange={() => toggleDifficulty('intermediate')}
                        />{' '}
                        Gemiddeld
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={selectedDifficulties.advanced}
                            onChange={() => toggleDifficulty('advanced')}
                        />{' '}
                        Gevorderd
                    </label>
                </aside>
                <main className="challenges-grid">
                    {filteredChallenges.map((challenge) => (
                        <Link
                            key={challenge.id}
                            to={`/challenges/${challenge.id}`}
                            className={`challenge-card ${challenge.difficultyClass}`}
                        >
                            <h3>{challenge.title}</h3>
                            <p>{challenge.difficulty}</p>
                        </Link>
                    ))}

                    {filteredChallenges.length === 0 && (
                        <p style={{ gridColumn: '1 / -1' }}>
                            Geen challenges gevonden. Pas je zoekterm of filters aan.
                        </p>
                    )}
                </main>
            </div>
        </div>
    );
}

export default Challenges;
