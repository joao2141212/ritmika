import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const appUrl = process.env.RITMIKA_APP_URL || 'https://ritmikapp.netlify.app';
const chromePath = process.env.CHROME_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const evidenceDir = process.env.RITMIKA_EVIDENCE_DIR || 'evidence';

const routes = [
  '/',
  '/checklists',
  '/team',
  '/configurations',
  '/notifications',
  '/courses',
  '/help',
  '/ideas',
  '/news',
];

const screenshotRoutes = new Set(['/', '/checklists', '/team', '/configurations']);

const request = async (path, {
  method = 'GET',
  body,
  key = secretKey,
  authorization = '',
} = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`http_${response.status}`);
    error.safePayload = {
      path,
      status: response.status,
      error: payload?.message || payload?.error || 'unknown',
    };
    throw error;
  }
  return payload;
};

const requireEnvironment = () => {
  if (!baseUrl || !secretKey?.startsWith('sb_secret_') || !publishableKey) {
    throw new Error('SUPABASE_URL_SECRET_OR_PUBLISHABLE_KEY_MISSING');
  }
};

const createQaSession = async () => {
  const [workspace] = await request('/rest/v1/ritmika_workspaces?select=id,source_system&source_system=eq.ritmika_qa');
  if (!workspace?.id) throw new Error('QA_WORKSPACE_NOT_FOUND');

  const [membership] = await request(
    `/rest/v1/ritmika_workspace_members?select=user_id&workspace_id=eq.${workspace.id}&is_owner=eq.true`,
  );
  if (!membership?.user_id) throw new Error('QA_OWNER_NOT_FOUND');

  const authUser = await request(`/auth/v1/admin/users/${membership.user_id}`);
  if (!authUser?.email) throw new Error('QA_AUTH_EMAIL_NOT_FOUND');

  const generated = await request('/auth/v1/admin/generate_link', {
    method: 'POST',
    body: { type: 'magiclink', email: authUser.email },
  });
  const tokenHash = generated?.properties?.hashed_token
    || generated?.hashed_token
    || new URL(generated?.properties?.action_link || '').searchParams.get('token');
  if (!tokenHash) throw new Error('QA_MAGIC_LINK_TOKEN_HASH_MISSING');

  const verified = await request('/auth/v1/verify', {
    method: 'POST',
    body: { type: 'email', token_hash: tokenHash },
    key: publishableKey,
  });
  if (!verified?.access_token || !verified?.refresh_token) {
    throw new Error('QA_SESSION_TOKEN_MISSING');
  }

  return {
    workspaceId: workspace.id,
    session: {
      access_token: verified.access_token,
      refresh_token: verified.refresh_token,
      expires_in: verified.expires_in,
      expires_at: Math.floor(Date.now() / 1000) + (verified.expires_in || 3600),
      token_type: verified.token_type || 'bearer',
      user: verified.user,
    },
  };
};

const routeSlug = (route) => (route === '/' ? 'dashboard' : route.slice(1).replaceAll('/', '-'));

const sweepViewport = async (browser, { label, viewport, storageKey, session }) => {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, { key: storageKey, value: session });

  const page = await context.newPage();
  const results = [];
  for (const route of routes) {
    const pageErrors = [];
    page.removeAllListeners('pageerror');
    page.on('pageerror', (error) => pageErrors.push(String(error?.message || error)));

    const response = await page.goto(`${appUrl}${route}`, { waitUntil: 'networkidle', timeout: 60000 })
      .catch((error) => ({ error: String(error?.message || error) }));
    await page.waitForTimeout(1200);

    const title = await page.locator('h1').first().textContent({ timeout: 3000 }).catch(() => null);
    const body = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    ).catch(() => null);
    const visibleButtons = await page.locator('button:visible').evaluateAll((buttons) => (
      buttons.slice(0, 8).map((button) => (
        button.innerText.trim() || button.getAttribute('aria-label') || button.title || 'icon-button'
      ))
    )).catch(() => []);

    let screenshot = null;
    if (screenshotRoutes.has(route)) {
      screenshot = `${evidenceDir}/prod-auth-${label}-${routeSlug(route)}.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
    }

    results.push({
      label,
      route,
      finalUrl: page.url(),
      status: typeof response?.status === 'function' ? response.status() : null,
      title,
      horizontalOverflow,
      visibleButtons,
      textStart: body.slice(0, 240).replace(/\s+/g, ' '),
      pageErrors,
      screenshot,
    });
  }

  await context.close();
  return results;
};

const run = async () => {
  requireEnvironment();
  await mkdir(evidenceDir, { recursive: true });

  const projectRef = new URL(baseUrl).hostname.split('.')[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const { workspaceId, session } = await createQaSession();
  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  try {
    const desktop = await sweepViewport(browser, {
      label: 'desktop',
      viewport: { width: 1440, height: 1000 },
      storageKey,
      session,
    });
    const mobile = await sweepViewport(browser, {
      label: 'mobile',
      viewport: { width: 390, height: 844 },
      storageKey,
      session,
    });
    process.stdout.write(`${JSON.stringify({
      status: 'ok',
      app_url: appUrl,
      qa_workspace_id: workspaceId,
      checked_at: new Date().toISOString(),
      desktop,
      mobile,
    }, null, 2)}\n`);
  } finally {
    await browser.close();
  }
};

run().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    status: 'failed',
    error: error?.message || String(error),
    detail: error?.safePayload || null,
  }, null, 2)}\n`);
  process.exit(1);
});
