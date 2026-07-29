import { createHash, randomUUID } from 'node:crypto';

type RequestOptions = RequestInit & { headers?: HeadersInit };

const baseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const secretKey = String(process.env.SUPABASE_SECRET_KEY || '');

export const requireAdminEnvironment = () => {
    if (!baseUrl || !secretKey) {
        throw new Error('SUPABASE_URL_or_SECRET_KEY_missing');
    }
    if (!secretKey.startsWith('sb_secret_')) {
        throw new Error('SUPABASE_SECRET_KEY_must_use_sb_secret_format');
    }
};

export const logEvent = (event) => {
    process.stderr.write(`${JSON.stringify({
        app: 'ritmika',
        layer: 'auth-ops',
        at: new Date().toISOString(),
        eventId: randomUUID(),
        ...event,
    })}\n`);
};

const request = async (path: string, options: RequestOptions = {}) => {
    requireAdminEnvironment();
    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            apikey: secretKey,
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });
    const text = await response.text();
    let payload = null;
    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            payload = { raw: text.slice(0, 500) };
        }
    }
    if (!response.ok) {
        throw Object.assign(new Error(`supabase_admin_http_${response.status}`), {
            statusCode: response.status,
            payload,
        });
    }
    return payload;
};

export const adminRequest = request;

export const patchTable = async (table, filters, updates) => request(
    `/rest/v1/${table}?${filters}`,
    {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(updates),
    },
);

export const fetchTable = async (table, query) => {
    const payload = await request(`/rest/v1/${table}?${query}`, {
        headers: { Prefer: 'count=exact' },
    });
    return Array.isArray(payload) ? payload : [];
};

export const fetchAllAuthUsers = async () => {
    const users = [];
    const perPage = 1000;
    for (let page = 1; page <= 100; page += 1) {
        const payload = await request(`/auth/v1/admin/users?page=${page}&per_page=${perPage}`);
        const pageUsers = Array.isArray(payload) ? payload : (payload?.users || []);
        users.push(...pageUsers);
        if (pageUsers.length < perPage) break;
    }
    return users;
};

export const emailFingerprint = (email) => createHash('sha256')
    .update(String(email || '').trim().toLowerCase())
    .digest('hex')
    .slice(0, 12);

export const emailDomain = (email) => String(email || '').trim().toLowerCase().split('@')[1] || '';

export const isQaRecord = (record: Record<string, any> = {}) => (
    record?.metadata?.ritmika_qa === true
    || record?.metadata?.ritmika_qa === 'true'
    || record?.preferences?.ritmika_qa === true
    || record?.preferences?.ritmika_qa === 'true'
    || record?.source_system === 'ritmika_qa'
);

export const groupBy = (rows, keyFn) => {
    const grouped = new Map();
    for (const row of rows) {
        const key = keyFn(row);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(row);
    }
    return grouped;
};
