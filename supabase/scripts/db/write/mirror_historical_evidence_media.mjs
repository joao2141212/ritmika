#!/usr/bin/env node

import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '../../../..');
process.loadEnvFile(path.join(repoRoot, '.env'));

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const confirmation = process.env.RITMIKA_DB_WRITE_CONFIRM;
const targetBucket = 'ritmika-evidences';
const maxBytes = 25 * 1024 * 1024;

if (confirmation !== 'yes') throw new Error('write_confirmation_required');
if (!supabaseUrl || !secretKey) throw new Error('SUPABASE_URL_or_SUPABASE_SECRET_KEY_missing');

const apiHeaders = {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
};

const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...apiHeaders,
            ...(options.headers || {}),
        },
    });
    const text = await response.text();
    let body = null;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        body = text;
    }
    if (!response.ok) {
        throw new Error(`supabase_http_${response.status}`);
    }
    return body;
};

const encodeStoragePath = (storagePath) => storagePath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

const extensionFor = (contentType, sourceUrl) => {
    const typeMap = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'application/pdf': '.pdf',
    };
    if (typeMap[contentType]) return typeMap[contentType];
    try {
        const extension = path.extname(new URL(sourceUrl).pathname).toLowerCase();
        return /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : '';
    } catch {
        return '';
    }
};

const sourceRows = async () => {
    const url = new URL(`${supabaseUrl}/rest/v1/ritmika_evidences`);
    url.searchParams.set('select', 'id,workspace_id,metadata,storage_bucket,storage_path,mime_type');
    url.searchParams.set('metadata->>historical_import', 'eq.true');
    url.searchParams.set('metadata->>source_url', 'not.is.null');
    url.searchParams.set('order', 'created_at.asc');
    return requestJson(url);
};

const mirrorRow = async (row) => {
    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const sourceUrl = metadata.source_url;
    if (!sourceUrl) return 'skipped_no_source';
    if (row.storage_bucket === targetBucket
        && String(row.storage_path || '').startsWith('historical/')
        && metadata.mirror_status === 'complete') {
        return 'skipped_complete';
    }

    const sourceResponse = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) });
    if (!sourceResponse.ok) throw new Error(`source_http_${sourceResponse.status}`);
    const declaredLength = Number(sourceResponse.headers.get('content-length') || 0);
    if (declaredLength > maxBytes) throw new Error('source_file_too_large');
    const bytes = Buffer.from(await sourceResponse.arrayBuffer());
    if (bytes.length > maxBytes) throw new Error('source_file_too_large');

    const contentType = (sourceResponse.headers.get('content-type') || row.mime_type || 'application/octet-stream')
        .split(';')[0]
        .trim()
        .toLowerCase();
    const checksum = crypto.createHash('sha256').update(bytes).digest('hex');
    const storagePath = `historical/${row.workspace_id}/${row.id}${extensionFor(contentType, sourceUrl)}`;
    const storageUrl = `${supabaseUrl}/storage/v1/object/${targetBucket}/${encodeStoragePath(storagePath)}`;

    await requestJson(storageUrl, {
        method: 'POST',
        headers: {
            'Content-Type': contentType,
            'x-upsert': 'true',
        },
        body: bytes,
    });

    const nextMetadata = {
        ...metadata,
        mirror_status: 'complete',
        mirror_storage_path: storagePath,
        mirrored_at: new Date().toISOString(),
        mirror_source_checksum: checksum,
    };
    const updateUrl = new URL(`${supabaseUrl}/rest/v1/ritmika_evidences`);
    updateUrl.searchParams.set('id', `eq.${row.id}`);
    await requestJson(updateUrl, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
        },
        body: JSON.stringify({
            storage_bucket: targetBucket,
            storage_path: storagePath,
            mime_type: contentType,
            checksum,
            metadata: nextMetadata,
        }),
    });
    return 'mirrored';
};

const parseLimit = () => {
    const limitArg = process.argv.find((argument) => argument.startsWith('--limit='));
    if (!limitArg) return null;
    const limit = Number(limitArg.slice('--limit='.length));
    if (!Number.isInteger(limit) || limit < 1) throw new Error('invalid_limit');
    return limit;
};

const run = async () => {
    const rows = await sourceRows();
    const limit = parseLimit();
    const selected = limit ? rows.slice(0, limit) : rows;
    const summary = {
        selected: selected.length,
        mirrored: 0,
        skipped_complete: 0,
        skipped_no_source: 0,
        failed: 0,
        failed_codes: {},
    };

    for (const row of selected) {
        try {
            const status = await mirrorRow(row);
            summary[status] = (summary[status] || 0) + 1;
        } catch (error) {
            summary.failed += 1;
            const code = error instanceof Error ? error.message : 'unknown_failure';
            summary.failed_codes[code] = (summary.failed_codes[code] || 0) + 1;
        }
    }

    const failedCodes = Object.entries(summary.failed_codes)
        .map(([code, count]) => `${code}:${count}`)
        .join(',') || 'none';
    console.log([
        'historical_media_mirror',
        `selected=${summary.selected}`,
        `mirrored=${summary.mirrored}`,
        `skipped_complete=${summary.skipped_complete}`,
        `skipped_no_source=${summary.skipped_no_source}`,
        `failed=${summary.failed}`,
        `failed_codes=${failedCodes}`,
    ].join('|'));
    if (summary.failed > 0) process.exitCode = 1;
};

run().catch((error) => {
    console.error(error instanceof Error ? error.message : 'historical_media_mirror_failed');
    process.exitCode = 1;
});
