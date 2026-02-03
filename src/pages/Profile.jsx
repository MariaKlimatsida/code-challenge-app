import { Link, Navigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import '../styles/global.css';
import Navbar from '../components/Navbar';
import { useAuth } from '../auth/useAuth.js';
import { listChallenges, listSubmissions } from '../api/noviClient.js';
import { challenges as fallbackChallenges, getChallengeById } from '../data/challenges.js';

function Profile() {
    const { user, isAuthenticated } = useAuth();

    const isAdmin = useMemo(() => {
        const roles = user?.roles || [];
        return Array.isArray(roles) && roles.includes('admin');
    }, [user]);

    const [score, setScore] = useState(0);
    const [progressPercent, setProgressPercent] = useState(0);
    const [recent, setRecent] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const displayName = useMemo(() => {
        if (!user) return '';
        return user.username || user.displayName || user.email || 'Gebruiker';
    }, [user]);

    const formatStatusLabel = (status) => {
        const v = String(status || '').toLowerCase();
        if (v === 'approved') return 'goedgekeurd';
        if (v === 'pending') return 'in behandeling';
        if (v === 'rejected') return 'afgekeurd';
        return v || 'onbekend';
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        let isCancelled = false;

        const pointsForFallbackChallenge = (challenge) => {
            const v = Number(challenge?.points);
            return Number.isFinite(v) && v > 0 ? v : 0;
        };

        const normalizeChallengeRef = (ref) => {
            if (ref === null || ref === undefined) return null;
            if (typeof ref === 'string' || typeof ref === 'number') return String(ref);
            if (typeof ref === 'object') {
                if (ref.id !== undefined) return String(ref.id);
                if (ref._id !== undefined) return String(ref._id);
            }
            return String(ref);
        };

        async function loadProfile() {
            setIsLoading(true);
            setError('');
            try {
                const email = user?.email || user?.userEmail;

                // 1) Load challenges (prefer NOVI) to know total points and map ids -> titles
                let challenges = [];
                try {
                    const fromApi = await listChallenges();
                    challenges = Array.isArray(fromApi) ? fromApi : [];
                } catch {
                    challenges = fallbackChallenges;
                }

                const totalPoints = challenges.reduce((sum, c) => sum + Number(pointsForFallbackChallenge(c) || 0), 0);

                const challengesById = new Map(
                    (challenges || []).map((c) => [normalizeChallengeRef(c.id || c._id || c.challengeId), c]),
                );

                const maxPointsForChallenge = (challenge) => {
                    const v = Number(challenge?.points);
                    return Number.isFinite(v) && v > 0 ? v : 100;
                };

                // 2) Load submissions (auth) and compute approved score + completed challenges
                const allSubmissions = await listSubmissions();
                const mine = (allSubmissions || []).filter((s) => {
                    return String(s.userEmail) === String(email);
                });

                const byDateDesc = (arr) => {
                    const items = Array.isArray(arr) ? arr : [];
                    const getTs = (s) => {
                        const v = s?.updatedAt || s?.createdAt || s?.date || '';
                        const t = Date.parse(v);
                        return Number.isFinite(t) ? t : 0;
                    };
                    return [...items].sort((a, b) => getTs(b) - getTs(a));
                };

                // Score: only count the latest approved result per challenge.
                // This prevents points from being added twice when a challenge is re-graded.
                const latestApprovedByChallenge = new Map();
                for (const s of byDateDesc(mine)) {
                    if (String(s?.status || '').toLowerCase() !== 'approved') continue;
                    const cid = normalizeChallengeRef(s.challenge);
                    if (!cid) continue;
                    if (!latestApprovedByChallenge.has(cid)) latestApprovedByChallenge.set(cid, s);
                }

                const awardedScore = [...latestApprovedByChallenge.values()].reduce((sum, s) => {
                    const v = s?.pointsAwarded ?? s?.pointsRequested;
                    return sum + Number(v || 0);
                }, 0);

                // Progress rules:
                // - All awarded points count towards progress.
                // - Progress may only be 100% if every challenge has an approved submission with full points.
                const allPerfect = (challenges || []).length > 0 && (challenges || []).every((c) => {
                    const cid = normalizeChallengeRef(c?.id ?? c?._id ?? c?.challengeId);
                    if (!cid) return false;

                    const s = latestApprovedByChallenge.get(cid);
                    if (!s) return false;

                    const awarded = Number(s?.pointsAwarded ?? s?.pointsRequested ?? 0);
                    const max = maxPointsForChallenge(c);
                    if (!Number.isFinite(awarded)) return false;
                    return awarded >= max;
                });

                const recentMine = byDateDesc(mine).slice(0, 5).map((s) => {
                    const cid = normalizeChallengeRef(s.challenge);
                    const c = cid ? challengesById.get(cid) : null;
                    const local = cid ? getChallengeById(String(cid)) : null;
                    const status = String(s.status || '').toLowerCase();
                    const points = Number(s.pointsAwarded ?? s.pointsRequested ?? 0);
                    const code = typeof s.code === 'string' ? s.code : '';

                    const snippet = code
                        .trim()
                        .split('\n')
                        .join(' ')
                        .slice(0, 80);

                    return {
                        id: cid || String(s.id),
                        title: c?.title || local?.title || 'Challenge',
                        status: formatStatusLabel(status),
                        points: Number.isFinite(points) ? points : 0,
                        codeSnippet: snippet,
                    };
                });

                // Ensure each challenge appears at most once (latest submission wins)
                const uniqueByChallenge = [];
                const seen = new Set();
                for (const item of recentMine) {
                    const key = String(item.id || '');
                    if (!key) continue;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    uniqueByChallenge.push(item);
                }

                const recentUnique = uniqueByChallenge.slice(0, 5);

                const pct = totalPoints > 0 ? (awardedScore / totalPoints) * 100 : 0;
                const rounded = Math.max(0, Math.min(100, Math.round(Number.isFinite(pct) ? pct : 0)));
                const clamped = allPerfect ? 100 : Math.min(99, rounded);

                if (!isCancelled) {
                    setScore(Number.isFinite(awardedScore) ? awardedScore : 0);
                    setProgressPercent(clamped);
                    setRecent(recentUnique);
                }
            } catch (err) {
                if (!isCancelled) {
                    setScore(0);
                    setProgressPercent(0);
                    setRecent([]);
                    setError(err?.message || 'Kon profiel niet laden');
                }
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        }

        loadProfile();
        return () => {
            isCancelled = true;
        };
    }, [isAuthenticated, user?.email, user?.userEmail]);

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (isAdmin) return <Navigate to="/admin" replace />;

    return (
        <div className="page-container">
            <Navbar />
            <header className="profile-header">
                <h1>{displayName}</h1>
                <p>
                    Score: {score} punten{isLoading ? ' (laden...)' : ''}
                </p>
                {error && <p style={{ color: 'crimson' }}>{error}</p>}
            </header>
            <section className="progress-section">
                <h2>Mijn Voortgang</h2>
                <div className="progress-bar">
                    <div className="progress" style={{ width: `${progressPercent}%` }}>
                        {progressPercent}%
                    </div>
                </div>
            </section>
            <section className="completed-challenges">
                <h2>Recente Challenges</h2>
                {recent.length === 0 ? (
                    <p>Nog geen submissions.</p>
                ) : (
                    <ul>
                        {recent.map((c) => (
                            <li key={c.id}>
                                <Link to={`/challenges/${c.id}`}>
                                    <strong>{c.title}</strong> – status: {c.status}
                                    {c.codeSnippet ? <span style={{ color: '#666' }}> – ingevuld: “{c.codeSnippet}”</span> : null}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

export default Profile;
