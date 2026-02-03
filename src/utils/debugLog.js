function nowIso() {
    return new Date().toISOString();
}

function safeJsonStringify(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return JSON.stringify({ error: 'Could not stringify value' });
    }
}

function truncateString(value, maxLen = 4000) {
    const s = String(value ?? '');
    if (s.length <= maxLen) return s;
    return `${s.slice(0, maxLen)}… (truncated, ${s.length} chars)`;
}

export function logDebug(event, details = {}) {
    if (!import.meta.env.DEV) return;

    const entry = {
        ts: nowIso(),
        event: String(event || 'event'),
        details,
    };

    // Fire-and-forget to dev server middleware.
    // Writes JSONL to /tmp/code-challenge-app-debug.jsonl (dev only).
    try {
        fetch('/__debuglog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: safeJsonStringify(entry),
            keepalive: true,
        }).catch(() => {
            // ignore
        });
    } catch {
        // ignore
    }
}

export function redactSensitive(value) {
    if (!value || typeof value !== 'object') return value;

    const SENSITIVE_KEYS = new Set(['password', 'token', 'accessToken', 'authorization']);

    const recurse = (v) => {
        if (!v || typeof v !== 'object') return v;
        if (Array.isArray(v)) return v.map(recurse);

        const out = {};
        Object.entries(v).forEach(([k, val]) => {
            if (SENSITIVE_KEYS.has(String(k).toLowerCase())) out[k] = '<redacted>';
            else out[k] = recurse(val);
        });
        return out;
    };

    return recurse(value);
}

export function summarizeBodyForLog(path, body) {
    if (!body) return null;

    // Avoid logging credentials in plaintext.
    if (String(path).includes('/api/login') || String(path).includes('/api/users')) {
        const redacted = redactSensitive(body);
        return redacted;
    }

    // Keep payload size modest.
    const redacted = redactSensitive(body);
    return redacted;
}

export function summarizeResponseTextForLog(text) {
    return text ? truncateString(text, 8000) : '';
}
