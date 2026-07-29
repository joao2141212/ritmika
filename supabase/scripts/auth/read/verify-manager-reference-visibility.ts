import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  || process.env.VITE_SUPABASE_ANON_KEY;
const appUrl = process.env.RITMIKA_APP_URL || 'https://ritmikapp.netlify.app';
const chromePath = process.env.CHROME_EXECUTABLE_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

type RequestOptions = { method?: string; body?: unknown; key?: string; token?: string };

const request = async (path: string, { method = 'GET', body, key = secretKey, token = '' }: RequestOptions = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`http_${response.status}:${payload?.message || payload?.error}`);
  return payload;
};

const run = async () => {
  if (!baseUrl || !secretKey?.startsWith('sb_secret_') || !publishableKey) {
    throw new Error('SUPABASE_URL_SECRET_OR_PUBLISHABLE_KEY_MISSING');
  }
  const [workspace] = await request(
    '/rest/v1/ritmika_workspaces?select=id&source_system=eq.ritmika_qa&limit=1',
  );
  const [owner] = await request(
    `/rest/v1/ritmika_workspace_members?select=user_id&workspace_id=eq.${workspace.id}`
      + '&is_owner=eq.true&limit=1',
  );
  const authUser = await request(`/auth/v1/admin/users/${owner.user_id}`);
  const generated = await request('/auth/v1/admin/generate_link', {
    method: 'POST',
    body: { type: 'magiclink', email: authUser.email },
  });
  const actionLink = generated?.action_link || generated?.properties?.action_link;
  const tokenHash = generated?.properties?.hashed_token
    || generated?.hashed_token
    || new URL(actionLink).searchParams.get('token');
  const verified = await request('/auth/v1/verify', {
    method: 'POST',
    body: { type: 'email', token_hash: tokenHash },
    key: publishableKey,
  });
  const profiles = await request(
    `/rest/v1/ritmika_profiles?select=id,role&workspace_id=eq.${workspace.id}&order=name.asc`,
    { key: publishableKey, token: verified.access_token },
  );
  const referenceTables = ['ritmika_units', 'ritmika_sectors', 'ritmika_moments'];
  const referenceResults = {};
  for (const table of referenceTables) {
    try {
      const rows = await request(
        `/rest/v1/${table}?select=id&workspace_id=eq.${workspace.id}`,
        { key: publishableKey, token: verified.access_token },
      );
      referenceResults[table] = { status: 'ok', count: rows.length };
    } catch (error) {
      referenceResults[table] = { status: 'error', error: String(error?.message || error) };
    }
  }
  const projectRef = new URL(baseUrl).hostname.split('.')[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const ui = { console_errors: [], failed_responses: [], responsible_options: [] };
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    }, {
      key: storageKey,
      value: {
        access_token: verified.access_token,
        refresh_token: verified.refresh_token,
        expires_in: verified.expires_in,
        expires_at: Math.floor(Date.now() / 1000) + (verified.expires_in || 3600),
        token_type: verified.token_type || 'bearer',
        user: verified.user,
      },
    });
    const page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') ui.console_errors.push(message.text().slice(0, 500));
    });
    page.on('response', async (response) => {
      if (response.status() < 400) return;
      const url = new URL(response.url());
      ui.failed_responses.push({
        status: response.status(),
        path: url.pathname,
        body: await response.text().catch(() => '').then((value) => value.slice(0, 300)),
      });
    });
    await page.goto(`${appUrl}/checklists/new`, { waitUntil: 'networkidle', timeout: 60000 });
    const responsible = page.getByLabel(/Responsável padrão/i);
    await responsible.waitFor({ timeout: 15000 });
    await page.waitForTimeout(3000);
    ui.responsible_options = await responsible.locator('option').evaluateAll((options) => (
      options.map((option) => ({ value: (option as HTMLOptionElement).value, label: option.textContent?.trim() }))
    ));
    await mkdir('evidence', { recursive: true });
    await page.screenshot({ path: 'evidence/manager-reference-visibility.png', fullPage: true });
    await context.close();
  } finally {
    await browser.close();
  }
  process.stdout.write(`${JSON.stringify({
    status: profiles.length > 1 ? 'ok' : 'incomplete',
    workspace_id: workspace.id,
    manager_user_id: owner.user_id,
    visible_profile_count: profiles.length,
    references: referenceResults,
    ui,
    profiles: profiles.map((profile) => ({ id: profile.id, role: profile.role })),
  }, null, 2)}\n`);
  if (profiles.length <= 1) process.exitCode = 1;
};

run().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    status: 'error',
    error: String(error?.message || error),
  })}\n`);
  process.exitCode = 1;
});
