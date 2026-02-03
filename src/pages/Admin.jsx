import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import '../styles/global.css';
import Navbar from '../components/Navbar';
import { useAuth } from '../auth/useAuth.js';
import {
    listPendingSubmissions,
    approveSubmission,
    registerUser,
    listChallenges,
    listProfiles,
    createProfile,
    listUsers,
    deleteUser,
    deleteProfile,
    listSubmissions,
    deleteSubmission,
} from '../api/noviClient';

// Fallback for seeded/local challenge titles when submissions store route ids (e.g. "1").
import { getChallengeById } from '../data/challenges';

function Admin() {
    const { user, isAuthenticated } = useAuth();

    const isAdmin = useMemo(() => {
        const roles = user?.roles || [];
        return roles.includes('admin');
    }, [user]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [submissions, setSubmissions] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [percentBySubmissionId, setPercentBySubmissionId] = useState({});

    const [profiles, setProfiles] = useState([]);
    const [users, setUsers] = useState([]);

    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState('user');
    const [createUserMessage, setCreateUserMessage] = useState('');

    async function load() {
        setIsLoading(true);
        setError('');
        try {
            const data = await listPendingSubmissions();
            setSubmissions(data || []);

            try {
                const p = await listProfiles();
                setProfiles(Array.isArray(p) ? p : []);
            } catch {
                setProfiles([]);
            }

            try {
                const u = await listUsers();
                setUsers(Array.isArray(u) ? u : []);
            } catch {
                setUsers([]);
            }

            try {
                const c = await listChallenges();
                setChallenges(Array.isArray(c) ? c : []);
            } catch {
                setChallenges([]);
            }
        } catch (err) {
            setError(err?.message || 'Kon submissions niet laden');
        } finally {
            setIsLoading(false);
        }
    }

    const usersByEmail = useMemo(() => {
        const map = new Map();
        (users || []).forEach((u) => {
            const email = String(u?.email || '').trim().toLowerCase();
            if (email) map.set(email, u);
        });
        return map;
    }, [users]);

    async function handleDeleteAccount(profile) {
        setError('');
        setCreateUserMessage('');

        const email = String(profile?.userEmail || '').trim();
        if (!email) {
            setError('Geen e-mailadres gevonden voor deze gebruiker.');
            return;
        }

        const myEmail = String(user?.email || '').trim();
        if (myEmail && myEmail.toLowerCase() === email.toLowerCase()) {
            setError('Je kunt je eigen (ingelogde) admin-account niet verwijderen.');
            return;
        }

        const ok = window.confirm(
            `Weet je zeker dat je ${email} wilt verwijderen?\n\nDit verwijdert ook alle submissions en het profiel (score/recente challenges).`,
        );
        if (!ok) return;

        setIsLoading(true);
        try {
            // 1) Delete submissions belonging to this email
            let all = [];
            try {
                const s = await listSubmissions();
                all = Array.isArray(s) ? s : [];
            } catch {
                all = [];
            }

            const mine = all.filter((s) => String(s?.userEmail || '').toLowerCase() === email.toLowerCase());
            for (const s of mine) {
                if (!s?.id) continue;
                try {
                    await deleteSubmission(s.id);
                } catch {
                    // continue deleting others
                }
            }

            // 2) Delete profile row (score)
            const profileId = profile?.id ?? profile?._id ?? null;
            if (profileId) {
                try {
                    await deleteProfile(profileId);
                } catch {
                    // ignore
                }
            }

            // 3) Delete auth user account (if endpoint supports it)
            const lookup = usersByEmail.get(email.toLowerCase());
            const userId = lookup?.id ?? lookup?._id ?? null;
            if (userId) {
                try {
                    await deleteUser(userId);
                } catch {
                    // ignore; still consider data cleanup succeeded
                }
            }

            setCreateUserMessage(`Gebruiker verwijderd: ${email}`);
            await load();
        } catch (err) {
            setError(err?.message || 'Gebruiker verwijderen mislukt');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCreateUser(e) {
        e.preventDefault();
        setError('');
        setCreateUserMessage('');
        try {
            await registerUser(newUserEmail, newUserPassword, [newUserRole]);

            // Ensure the user is visible in the Admin "gebruikers" list.
            // Profiles are managed via the Dynamic API collections and can be listed by admins.
            try {
                const email = String(newUserEmail).trim();
                const displayName = email.includes('@') ? email.split('@')[0] : email;
                await createProfile({
                    userEmail: email,
                    displayName: displayName || email,
                    totalScore: 0,
                });
            } catch {
                // Ignore profile-creation errors (e.g. profile already exists)
            }

            setCreateUserMessage('Gebruiker aangemaakt. De gebruiker kan nu inloggen via /login.');
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserRole('user');

            await load();
        } catch (err) {
            setError(err?.message || 'Gebruiker aanmaken mislukt');
        }
    }

    useEffect(() => {
        load();
    }, []);

    const normalizeChallengeRef = (ref) => {
        if (ref === null || ref === undefined) return null;
        if (typeof ref === 'string' || typeof ref === 'number') return String(ref);
        if (typeof ref === 'object') {
            if (ref.id !== undefined) return String(ref.id);
            if (ref._id !== undefined) return String(ref._id);
        }
        return String(ref);
    };

    const normalizeChallengeId = (c) => {
        if (!c) return null;
        return String(c.id ?? c._id ?? c.challengeId ?? '');
    };

    const challengesById = useMemo(() => {
        const map = new Map();
        (challenges || []).forEach((c) => {
            const cid = normalizeChallengeId(c);
            if (cid) map.set(cid, c);
        });
        return map;
    }, [challenges]);

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/" replace />;

    const getMaxPointsForSubmission = (submission) => {
        const challengeId = normalizeChallengeRef(submission?.challenge);
        const linked = challengeId ? challengesById.get(challengeId) : null;
        const max = Number(linked?.points ?? submission?.pointsRequested ?? 100);
        return Number.isFinite(max) && max > 0 ? max : 100;
    };

    const getChallengeTitleForSubmission = (submission) => {
        const challengeId = normalizeChallengeRef(submission?.challenge);
        const linked = challengeId ? challengesById.get(challengeId) : null;
        if (linked?.title) return String(linked.title);

        if (challengeId) {
            const local = getChallengeById(String(challengeId));
            if (local?.title) return String(local.title);
        }

        return challengeId ? String(challengeId) : 'Onbekend';
    };

    async function handleApprove(submission) {
        setError('');
        try {
            const maxPoints = getMaxPointsForSubmission(submission);
            const selectedPercent = Number(percentBySubmissionId?.[submission.id] ?? 100);
            const safePercent = Math.max(10, Math.min(100, Number.isFinite(selectedPercent) ? selectedPercent : 100));
            const pointsAwarded = Math.round((maxPoints * safePercent) / 100);

            // Mark as approved and store points awarded.
            await approveSubmission(submission.id, {
                status: 'approved',
                pointsAwarded,
                pointsRequested: Number(submission.pointsRequested ?? maxPoints),
            });

            await load();
        } catch (err) {
            setError(err?.message || 'Goedkeuren mislukt');
        }
    }

    async function handleReject(submission) {
        setError('');
        try {
            await approveSubmission(submission.id, { status: 'rejected', pointsAwarded: 0 });
            await load();
        } catch (err) {
            setError(err?.message || 'Afkeuren mislukt');
        }
    }

    return (
        <div className="page-container">
            <Navbar />

            <div style={{ width: 'min(900px, 92vw)' }}>
                <h1>Admin – Inzendingen</h1>
                <p>
                    Beoordeel inzendingen en ken punten toe. Je kiest 10/25/50/75/90/100% van de max punten per challenge.
                </p>

                <div style={{ marginTop: 20, marginBottom: 20 }}>
                    <h2>Gebruiker aanmaken</h2>
                    <form onSubmit={handleCreateUser} style={{ textAlign: 'left' }}>
                        <label htmlFor="newUserEmail">E-mailadres</label>
                        <input
                            id="newUserEmail"
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            required
                        />

                        <label htmlFor="newUserPassword">Wachtwoord</label>
                        <input
                            id="newUserPassword"
                            type="password"
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                            required
                        />

                        <label htmlFor="newUserRole">Rol</label>
                        <select
                            id="newUserRole"
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value)}
                            style={{ width: '100%', padding: 10, marginBottom: 15, borderRadius: 5 }}
                        >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                        </select>

                        {createUserMessage && <p style={{ color: '#1b5e20' }}>{createUserMessage}</p>}
                        <button className="btn" type="submit">Gebruiker aanmaken</button>
                    </form>
                </div>

                <div style={{ marginTop: 20, marginBottom: 20 }}>
                    <h2>Bestaande gebruikers</h2>
                    {profiles.length === 0 ? (
                        <p>Nog geen gebruikers gevonden.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 10 }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>E-mailadres</th>
                                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Naam</th>
                                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Acties</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...profiles]
                                        .sort((a, b) => String(a.userEmail || '').localeCompare(String(b.userEmail || '')))
                                        .map((p) => (
                                            <tr key={p.id ?? p._id ?? p.userEmail}>
                                                <td style={{ padding: 10, borderBottom: '1px solid #f3f3f3' }}>{String(p.userEmail || '')}</td>
                                                <td style={{ padding: 10, borderBottom: '1px solid #f3f3f3' }}>{String(p.displayName || '')}</td>
                                                <td style={{ padding: 10, borderBottom: '1px solid #f3f3f3' }}>
                                                    <button className="btn" type="button" onClick={() => handleDeleteAccount(p)} disabled={isLoading}>
                                                        Verwijder
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <button className="btn" type="button" onClick={load} disabled={isLoading}>
                    {isLoading ? 'Laden...' : 'Ververs'}
                </button>

                {error && <p style={{ color: 'crimson' }}>{error}</p>}

                {isLoading ? (
                    <p>Bezig met laden…</p>
                ) : submissions.length === 0 ? (
                    <p>Geen inzendingen in afwachting.</p>
                ) : (
                    <div style={{ marginTop: 16 }}>
                        {submissions.map((s) => (
                            (() => {
                                const challengeId = normalizeChallengeRef(s.challenge);
                                const linked = challengeId ? challengesById.get(challengeId) : null;
                                const maxPoints = getMaxPointsForSubmission(s);
                                const selectedPercent = Number(percentBySubmissionId?.[s.id] ?? 100);
                                const safePercent = Math.max(10, Math.min(100, Number.isFinite(selectedPercent) ? selectedPercent : 100));
                                const previewAwarded = Math.round((maxPoints * safePercent) / 100);
                                const challengeTitle = getChallengeTitleForSubmission(s);
                                const submittedCode = typeof s.code === 'string' ? s.code : '';

                                return (
                            <div
                                key={s.id}
                                style={{
                                    background: 'white',
                                    borderRadius: 10,
                                    padding: 16,
                                    marginBottom: 12,
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.08)',
                                }}
                            >
                                <p><strong>Inzending ID:</strong> {s.id}</p>
                                <p><strong>Gebruiker:</strong> {String(s.userEmail)}</p>
                                <p>
                                    <strong>Challenge:</strong> {challengeTitle}
                                    {!linked?.title && challengeId ? (
                                        <span style={{ color: '#666' }}> (id: {String(challengeId)})</span>
                                    ) : null}
                                </p>
                                <p><strong>Max punten:</strong> {maxPoints}</p>
                                <p><strong>Status:</strong> {String(s.status || '')}</p>

                                <div style={{ marginTop: 12 }}>
                                    <strong>Ingediende code/antwoord:</strong>
                                    {submittedCode.trim().length === 0 ? (
                                        <p style={{ marginTop: 8, color: '#666' }}>Geen code/antwoord meegegeven.</p>
                                    ) : (
                                        <pre
                                            style={{
                                                marginTop: 8,
                                                padding: 12,
                                                background: '#f6f8fa',
                                                borderRadius: 8,
                                                overflowX: 'auto',
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        >
                                            {submittedCode}
                                        </pre>
                                    )}
                                </div>

                                <label htmlFor={`pct-${s.id}`} style={{ display: 'block', marginTop: 12 }}>
                                    Beoordeling (percentage)
                                </label>
                                <select
                                    id={`pct-${s.id}`}
                                    value={safePercent}
                                    onChange={(e) =>
                                        setPercentBySubmissionId((prev) => ({
                                            ...prev,
                                            [s.id]: Number(e.target.value),
                                        }))
                                    }
                                    style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 5 }}
                                >
                                    {[10, 25, 50, 75, 90, 100].map((p) => (
                                        <option key={p} value={p}>{p}%</option>
                                    ))}
                                </select>

                                <p>
                                    <strong>Toe te kennen punten:</strong> {previewAwarded}
                                </p>

                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    <button className="btn" type="button" onClick={() => handleApprove(s)}>
                                        Goedkeuren
                                    </button>
                                    <button className="btn" type="button" onClick={() => handleReject(s)}>
                                        Afkeuren
                                    </button>
                                </div>
                            </div>
                                );
                            })()
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Admin;
