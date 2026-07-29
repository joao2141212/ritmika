#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '../../../..');
process.loadEnvFile(path.join(repoRoot, '.env'));

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) throw new Error('SUPABASE_URL_or_SUPABASE_SECRET_KEY_missing');

const headers = {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
};

const response = await fetch(`${supabaseUrl}/rest/v1/ritmika_evidences?select=storage_path&storage_bucket=eq.ritmika-evidences&metadata->>mirror_status=eq.complete&limit=1`, { headers });
if (!response.ok) throw new Error(`supabase_http_${response.status}`);
const rows = await response.json();
if (!Array.isArray(rows) || rows.length === 0) {
    console.log('private_evidence_access|checked=0|signed=0');
    process.exit(0);
}

const signResponse = await fetch(`${supabaseUrl}/storage/v1/object/sign/ritmika-evidences`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 60, paths: [rows[0].storage_path] }),
});
if (!signResponse.ok) throw new Error(`storage_sign_http_${signResponse.status}`);
const signed = await signResponse.json();
const signedCount = Array.isArray(signed) ? signed.length : (signed?.signedURL ? 1 : 0);
console.log(`private_evidence_access|checked=1|signed=${signedCount}`);
