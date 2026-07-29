const configuredUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '');
const selectedName = process.env.SUPABASE_SECRET_KEY ? 'SUPABASE_SECRET_KEY' : 'missing';
const selectedKey = String(process.env.SUPABASE_SECRET_KEY || '');
const keyKind = selectedKey.startsWith('sb_secret_') ? 'sb_secret' : (selectedKey ? 'invalid' : 'missing');

let host = 'invalid';
try {
    host = new URL(configuredUrl).host;
} catch {
    // The output remains non-sensitive and actionable.
}

process.stdout.write(`${JSON.stringify({
    url_host: host,
    selected_key_name: selectedName,
    key_kind: keyKind,
    key_length: selectedKey.length,
    safe_to_attempt_admin_api: host !== 'invalid' && keyKind === 'sb_secret',
}, null, 2)}\n`);
