const DEFAULT_BASE_URL = import.meta.env.DEV
    ? ''
    : (import.meta.env.VITE_NOVI_BASE_URL || 'https://novi-backend-api-wgsgz.ondigitalocean.app');

import {
    logDebug,
    summarizeBodyForLog,
    summarizeResponseTextForLog,
    redactSensitive,
} from '../utils/debugLog.js';

function makeRequestId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getProjectId() {
    return import.meta.env.VITE_NOVI_PROJECT_ID;
}

function getToken() {
    return localStorage.getItem('novi.token');
}

export function setToken(token) {
    if (!token) {
        localStorage.removeItem('novi.token');
        return;
    }
    localStorage.setItem('novi.token', token);
}

export function clearSession() {
    localStorage.removeItem('novi.token');
    localStorage.removeItem('novi.user');
}

export function getSessionUser() {
    const raw = localStorage.getItem('novi.user');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function setSessionUser(user) {
    localStorage.setItem('novi.user', JSON.stringify(user));
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
    const projectId = getProjectId();
    if (!projectId) {
        throw new Error('Missing VITE_NOVI_PROJECT_ID. Copy .env.example to .env and set your Project ID.');
    }

    const requestId = makeRequestId();

    logDebug('api.request', {
        requestId,
        method,
        path,
        auth,
        hasProjectId: Boolean(projectId),
        projectIdSuffix: String(projectId).slice(-6),
        baseUrl: DEFAULT_BASE_URL || '(dev-proxy)',
        body: summarizeBodyForLog(path, body),
    });

    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'novi-education-project-id': projectId,
    };

    if (auth) {
        const token = getToken();
        if (!token) throw new Error('Not logged in');
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${DEFAULT_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = null;
        }
    }

    if (!res.ok) {
        const message = data?.message || data?.error || text || res.statusText;

        logDebug('api.response.error', {
            requestId,
            method,
            path,
            status: res.status,
            statusText: res.statusText,
            message,
            responseText: summarizeResponseTextForLog(text),
            responseJson: data ? redactSensitive(data) : null,
        });

        throw new Error(message);
    }

    logDebug('api.response.ok', {
        requestId,
        method,
        path,
        status: res.status,
        statusText: res.statusText,
    });

    return data;
}

// Auth
export async function login(email, password) {
    const data = await request('/api/login', {
        method: 'POST',
        body: { email, password },
    });

    // Documented response shape: { token, user }
    const token = data.token || data.accessToken;
    if (!token) throw new Error('Login response did not include a token');

    setToken(token);
    if (data.user) setSessionUser(data.user);
    else setSessionUser({ email });

    return data;
}

export async function registerUser(email, password, roles = ['user']) {
    // Many NOVI Dynamic API setups expose POST /api/users
    return request('/api/users', {
        method: 'POST',
        body: { email, password, roles },
        auth: true,
    });
}

export async function listUsers() {
    return request('/api/users', { method: 'GET', auth: true });
}

export async function deleteUser(id) {
    return request(`/api/users/${id}`, { method: 'DELETE', auth: true });
}

// Collections (these endpoints depend on your uploaded config)
export async function listChallenges() {
    return request('/api/challenges', { method: 'GET' });
}

export async function createChallenge(challenge) {
    return request('/api/challenges', { method: 'POST', body: challenge, auth: true });
}

export async function listProfiles() {
    return request('/api/profiles', { method: 'GET', auth: true });
}

export async function deleteProfile(id) {
    return request(`/api/profiles/${id}`, { method: 'DELETE', auth: true });
}

export async function createProfile(profile) {
    return request('/api/profiles', { method: 'POST', body: profile, auth: true });
}

export async function updateProfile(id, patch) {
    return request(`/api/profiles/${id}`, { method: 'PATCH', body: patch, auth: true });
}

export async function listPendingSubmissions() {
    // Many NOVI Dynamic API setups support basic filtering through query params.
    // If it doesn't, we'll fall back to filtering client-side.
    try {
        return await request('/api/submissions?status=pending', { method: 'GET', auth: true });
    } catch {
        const all = await request('/api/submissions', { method: 'GET', auth: true });
        return (all || []).filter((s) => s.status === 'pending');
    }
}

export async function approveSubmission(id, patch) {
    return request(`/api/submissions/${id}`, { method: 'PATCH', body: patch, auth: true });
}

export async function updateSubmission(id, patch) {
    return request(`/api/submissions/${id}`, { method: 'PATCH', body: patch, auth: true });
}

export async function deleteSubmission(id) {
    return request(`/api/submissions/${id}`, { method: 'DELETE', auth: true });
}

export async function createSubmission(submission) {
    return request('/api/submissions', { method: 'POST', body: submission, auth: true });
}

export async function listSubmissions() {
    return request('/api/submissions', { method: 'GET', auth: true });
}
