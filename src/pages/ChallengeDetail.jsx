import { Link, Navigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import '../styles/global.css';
import './ChallengeDetail.css';
import Navbar from '../components/Navbar';
import { useAuth } from '../auth/useAuth.js';
import { createSubmission, listChallenges, listSubmissions, updateSubmission } from '../api/noviClient';
import { logDebug } from '../utils/debugLog.js';

// Temporary: until challenges are pulled from NOVI.
import { getChallengeById } from '../data/challenges';

function ChallengeDetail() {
    const { id } = useParams();
    const [challenge, setChallenge] = useState(() => getChallengeById(id));
    const { user, isAuthenticated } = useAuth();

    const isAdmin = useMemo(() => {
        const roles = user?.roles || [];
        return Array.isArray(roles) && roles.includes('admin');
    }, [user]);

    const [code, setCode] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [comment, setComment] = useState('');
    const [commentNotice, setCommentNotice] = useState('');
    const [comments, setComments] = useState([]);

    const [existingSubmission, setExistingSubmission] = useState(null);
    const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);

    const commentStorageKey = useMemo(() => `code-challenge-app.comments.${String(id)}`, [id]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(commentStorageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            setComments(Array.isArray(parsed) ? parsed : []);
        } catch {
            setComments([]);
        }
    }, [commentStorageKey]);

    useEffect(() => {
        let isCancelled = false;

        const normalizeId = (c) => {
            if (!c) return null;
            return String(c.id ?? c._id ?? c.challengeId ?? '');
        };

        async function load() {
            try {
                const fromApi = await listChallenges();
                const found = (Array.isArray(fromApi) ? fromApi : []).find((c) => normalizeId(c) === String(id));
                if (!isCancelled && found) {
                    setChallenge({
                        ...found,
                        id: normalizeId(found) || found.id,
                    });
                    return;
                }
            } catch {
                // ignore and fall back
            }
            if (!isCancelled) setChallenge(getChallengeById(id));
        }

        load();
        return () => {
            isCancelled = true;
        };
    }, [id]);

    const maxPoints = useMemo(() => {
        const v = Number(challenge?.points);
        if (Number.isFinite(v) && v > 0) return v;
        return 100;
    }, [challenge]);

    const pointsRequested = useMemo(() => maxPoints, [maxPoints]);

    useEffect(() => {
        if (!isAuthenticated) return;
        if (isAdmin) return;

        let isCancelled = false;

        const normalizeChallengeRef = (ref) => {
            if (ref === null || ref === undefined) return null;
            if (typeof ref === 'string' || typeof ref === 'number') return String(ref);
            if (typeof ref === 'object') {
                if (ref.id !== undefined) return String(ref.id);
                if (ref._id !== undefined) return String(ref._id);
            }
            return String(ref);
        };

        const pickNewest = (arr) => {
            const items = Array.isArray(arr) ? arr : [];
            const byDate = (s) => {
                const v = s?.updatedAt || s?.createdAt || s?.date || '';
                const t = Date.parse(v);
                return Number.isFinite(t) ? t : 0;
            };
            return [...items].sort((a, b) => byDate(b) - byDate(a))[0] || null;
        };

        async function loadMine() {
            setIsLoadingSubmission(true);
            try {
                const all = await listSubmissions();
                const email = String(user?.email || user?.userEmail || '');
                const routeRef = String(id);
                const stateRef = String(challenge?.id ?? challenge?._id ?? routeRef);

                const mineForChallenge = (Array.isArray(all) ? all : []).filter((s) => {
                    if (String(s?.userEmail || '') !== email) return false;
                    const cref = normalizeChallengeRef(s?.challenge);
                    return cref === routeRef || cref === stateRef;
                });

                const latest = pickNewest(mineForChallenge);
                if (!isCancelled) {
                    setExistingSubmission(latest);
                    if (latest?.code && typeof latest.code === 'string') {
                        setCode(latest.code);
                    }
                }
            } catch {
                if (!isCancelled) setExistingSubmission(null);
            } finally {
                if (!isCancelled) setIsLoadingSubmission(false);
            }
        }

        loadMine();
        return () => {
            isCancelled = true;
        };
    }, [isAuthenticated, isAdmin, id, user?.email, user?.userEmail, challenge?.id, challenge?._id]);

    if (isAuthenticated && isAdmin) return <Navigate to="/admin" replace />;

    async function handleSubmit() {
        if (!isAuthenticated) return;
        setError('');
        setMessage('');
        setIsSubmitting(true);

        if (isAdmin) {
            setError('Je bent ingelogd als admin. Alleen gebruikersaccounts (role: user) kunnen een oplossing indienen.');
            setIsSubmitting(false);
            return;
        }

        if (code.trim().length === 0) {
            setError('Je oplossing is leeg. Vul eerst je code/antwoord in voordat je indient.');
            setIsSubmitting(false);
            return;
        }

        const challengeRefFromState = challenge?.id ?? challenge?._id ?? null;
        const challengeRef = String(challengeRefFromState ?? id);

        logDebug('submission.attempt', {
            routeId: String(id),
            challengeRef,
            challengeFromState: {
                id: challenge?.id ?? null,
                _id: challenge?._id ?? null,
                title: challenge?.title ?? null,
            },
            userEmail: String(user?.email || ''),
            pointsRequested: Number(pointsRequested),
            codeLength: code.trim().length,
        });
        try {
            const email = String(user?.email || '');
            const routeRef = String(id);
            const stateRef = String(challengeRefFromState ?? routeRef);

            const normalizeChallengeRef = (ref) => {
                if (ref === null || ref === undefined) return null;
                if (typeof ref === 'string' || typeof ref === 'number') return String(ref);
                if (typeof ref === 'object') {
                    if (ref.id !== undefined) return String(ref.id);
                    if (ref._id !== undefined) return String(ref._id);
                }
                return String(ref);
            };

            const sameUser = (s) => String(s?.userEmail || '') === email;
            const sameChallenge = (s) => {
                const cref = normalizeChallengeRef(s?.challenge);
                return cref === routeRef || cref === stateRef;
            };

            let submissionToUpdate = null;
            if (existingSubmission?.id && sameUser(existingSubmission) && sameChallenge(existingSubmission)) {
                submissionToUpdate = existingSubmission;
            } else {
                // Safety net: ensure only 1 submission per challenge even if state wasn't loaded yet.
                try {
                    const all = await listSubmissions();
                    const mine = (Array.isArray(all) ? all : []).filter((s) => sameUser(s) && sameChallenge(s));

                    const pickNewest = (arr) => {
                        const items = Array.isArray(arr) ? arr : [];
                        const byDate = (s) => {
                            const v = s?.updatedAt || s?.createdAt || s?.date || '';
                            const t = Date.parse(v);
                            return Number.isFinite(t) ? t : 0;
                        };
                        return [...items].sort((a, b) => byDate(b) - byDate(a))[0] || null;
                    };

                    submissionToUpdate = pickNewest(mine);
                } catch {
                    submissionToUpdate = null;
                }
            }

            if (submissionToUpdate?.id) {
                const wasApproved = String(submissionToUpdate.status || '').toLowerCase() === 'approved';
                if (wasApproved) {
                    const ok = window.confirm(
                        'Deze challenge is eerder goedgekeurd. Als je opnieuw indient wordt je score opnieuw beoordeeld. Doorgaan?',
                    );
                    if (!ok) {
                        setIsSubmitting(false);
                        return;
                    }
                }

                const updated = await updateSubmission(submissionToUpdate.id, {
                    challenge: challengeRef,
                    userEmail: email,
                    code,
                    status: 'pending',
                    pointsRequested: Number(pointsRequested),
                    pointsAwarded: null,
                });
                setExistingSubmission(updated || submissionToUpdate);
                setMessage('Je antwoord is opgeslagen en opnieuw ingediend (pending). De admin beoordeelt hem en kent 10/25/50/75/90/100% van de punten toe.');
                logDebug('submission.updated', { challengeRef, submissionId: String(submissionToUpdate.id) });
            } else {
                const created = await createSubmission({
                    challenge: challengeRef,
                    userEmail: email,
                    code,
                    status: 'pending',
                    pointsRequested: Number(pointsRequested),
                });
                setExistingSubmission(created || null);
                setMessage('Je submission is ingediend. De admin beoordeelt hem en kent 10/25/50/75/90/100% van de punten toe.');
                logDebug('submission.success', { challengeRef });
            }
        } catch (err) {
            const msg = err?.message || 'Indienen mislukt';
            const projectId = String(import.meta.env?.VITE_NOVI_PROJECT_ID || '');
            const projectIdSuffix = projectId ? projectId.slice(-6) : '';
            logDebug('submission.error', {
                challengeRef,
                message: msg,
            });

            if (msg.includes("Unsupported field type 'reference' for field 'challenge'")) {
                logDebug('submission.schema_mismatch_reference', {
                    challengeRef,
                    projectIdSuffix,
                    hint: 'NOVI Dynamic API project schema expects unsupported field type reference. Update schema to use string for submissions.challenge, or ensure app points to the correct project id.',
                });
                setError(
                    `Indienen mislukt: je NOVI project-config gebruikt nog een on-ondersteund veldtype (reference) voor submissions.challenge. Upload opnieuw je bijgewerkte novi-config.json (waar challenge een string is) naar hetzelfde NOVI project. Project-id suffix: ${projectIdSuffix || 'onbekend'}.`,
                );
            } else if (msg === 'Not Acceptable') {
                setError(
                    'Indienen mislukt (406). Meestal betekent dit dat de backend-config niet overeenkomt met wat de app verstuurt. Controleer of je de juiste NOVI project-id gebruikt en of je config is toegepast.',
                );
            } else if (msg === 'Forbidden') {
                setError(
                    'Je hebt geen rechten om een submission te plaatsen (403). Log in met een gebruikersaccount (role: user). Een admin-account kan wel beoordelen, maar niet indienen.',
                );
            } else if (msg === 'Not logged in') {
                setError('Je bent niet ingelogd. Log in om een oplossing in te dienen.');
            } else {
                setError(msg);
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    function handlePostComment() {
        setCommentNotice('');

        if (!isAuthenticated) {
            setCommentNotice('Je bent niet ingelogd. Log in om een reactie te plaatsen.');
            return;
        }

        if (comment.trim().length === 0) {
            setCommentNotice('Typ eerst een reactie voordat je op “Plaats reactie” klikt.');
            return;
        }

        const displayName = String(user?.displayName || user?.name || user?.email || 'Gebruiker');
        const userEmail = String(user?.email || '');
        const newComment = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            text: comment.trim(),
            displayName,
            userEmail,
            createdAt: new Date().toISOString(),
        };

        const next = [...comments, newComment];
        setComments(next);
        try {
            localStorage.setItem(commentStorageKey, JSON.stringify(next));
        } catch {
            // ignore storage errors (e.g. private mode)
        }

        logDebug('comment.posted', {
            challengeId: String(id),
            commentId: newComment.id,
            userEmail,
            textLength: newComment.text.length,
        });

        setComment('');
        setCommentNotice('Reactie geplaatst.');
    }

    return (
        <div className="page-container challenge-detail-page">
            <Navbar />

            {!challenge ? (
                <header className="challenge-header">
                    <h1>Challenge niet gevonden</h1>
                    <p>Deze challenge bestaat (nog) niet.</p>
                </header>
            ) : (
                <header className="challenge-header">
                    <h1>{challenge.title}</h1>
                    <p>{challenge.description}</p>
                    <p>
                        <strong>Max punten:</strong> {maxPoints}. De admin kent na beoordeling 10/25/50/75/90/100% toe.
                    </p>
                </header>
            )}

            <main className="challenge-main">
                <textarea
                    className="code-editor"
                    placeholder="Typ hier je oplossing..."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                ></textarea>

                <p style={{ marginTop: 10, color: '#666' }}>
                    Tip: vul een korte, duidelijke oplossing in (niet leeg). Na indienen beoordeelt de admin en kent 10/25/50/75/90/100% van de punten toe.
                </p>

                {!isAuthenticated ? (
                    <p>
                        Je moet <Link to="/login">inloggen</Link> om een oplossing in te dienen.
                    </p>
                ) : (
                    <>
                        {error && <p style={{ color: 'crimson' }}>{error}</p>}
                        {message && <p style={{ color: '#1b5e20' }}>{message}</p>}

                        {isLoadingSubmission ? (
                            <p style={{ color: '#666' }}>Je eerdere submission wordt geladen…</p>
                        ) : existingSubmission ? (
                            <p style={{ color: '#666' }}>
                                Laatste submission status: <strong>{String(existingSubmission.status || 'onbekend')}</strong>. Je kunt je antwoord aanpassen en opnieuw indienen.
                            </p>
                        ) : null}

                        {isAdmin && (
                            <p style={{ color: 'crimson' }}>
                                Je bent ingelogd als admin. Log in als user om een oplossing in te dienen.
                            </p>
                        )}

                        <button className="btn" type="button" onClick={handleSubmit} disabled={isSubmitting || isAdmin}>
                            {isSubmitting ? 'Bezig...' : 'Oplossing Indienen (pending)'}
                        </button>
                    </>
                )}
            </main>
            <section className="comments-section">
                <h2>Reacties</h2>
                <textarea
                    className="comment-box"
                    placeholder={isAuthenticated ? 'Plaats een reactie...' : 'Log in om een reactie te plaatsen...'}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                ></textarea>

                <button className="btn" type="button" onClick={handlePostComment}>
                    Plaats reactie
                </button>

                {commentNotice && (
                    <p style={{ marginTop: 10, color: isAuthenticated ? '#213547' : 'crimson' }}>
                        {commentNotice}{!isAuthenticated && (
                            <> <Link to="/login">Inloggen</Link></>
                        )}
                    </p>
                )}
                <div className="comments-list">
                    {comments.length === 0 ? (
                        <p>Nog geen reacties.</p>
                    ) : (
                        comments.map((c) => (
                            <p key={c.id}>
                                <strong>{c.displayName}:</strong> {c.text}
                            </p>
                        ))
                    )}
                </div>
            </section>
            <footer className="challenge-footer">
                <Link to="/challenges" className="btn">Terug naar Challenges</Link>
            </footer>
        </div>
    );
}

export default ChallengeDetail;
