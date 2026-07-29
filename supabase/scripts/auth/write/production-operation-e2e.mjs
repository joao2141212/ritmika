import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_ROLE;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || process.env.SUPABASE_ANON_KEY;
const appUrl = process.env.RITMIKA_APP_URL || 'https://ritmikapp.netlify.app';
const chromePath = process.env.CHROME_EXECUTABLE_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const evidenceDir = process.env.RITMIKA_EVIDENCE_DIR || 'evidence';
const apply = process.argv.includes('--apply');

const safeError = (error) => ({
  name: error?.name || 'Error',
  message: String(error?.message || error),
});

const request = async (path, {
  method = 'GET',
  body,
  key = secretKey,
} = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
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

const createOperatorSession = async () => {
  const [workspace] = await request(
    '/rest/v1/ritmika_workspaces?select=id,source_system&source_system=eq.ritmika_qa',
  );
  if (!workspace?.id) throw new Error('QA_WORKSPACE_NOT_FOUND');

  const [membership] = await request(
    `/rest/v1/ritmika_workspace_members?select=user_id,role,is_owner`
      + `&workspace_id=eq.${workspace.id}&role=eq.operator&is_owner=eq.false&limit=1`,
  );
  if (!membership?.user_id) throw new Error('QA_OPERATOR_NOT_FOUND');

  const authUser = await request(`/auth/v1/admin/users/${membership.user_id}`);
  if (!authUser?.email) throw new Error('QA_OPERATOR_AUTH_EMAIL_NOT_FOUND');

  const generated = await request('/auth/v1/admin/generate_link', {
    method: 'POST',
    body: { type: 'magiclink', email: authUser.email },
  });
  const tokenHash = generated?.properties?.hashed_token
    || generated?.hashed_token
    || new URL(generated?.action_link || generated?.properties?.action_link).searchParams.get('token');
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
    authUserId: membership.user_id,
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

const clickFirstVisible = async (locators) => {
  for (const locator of locators) {
    if (await locator.first().isVisible().catch(() => false)) {
      await locator.first().click();
      return true;
    }
  }
  return false;
};

const answerFirstItem = async (page) => {
  if (await clickFirstVisible([
    page.getByRole('button', { name: /^Feito$/i }),
    page.getByRole('button', { name: /^Sim$/i }),
    page.getByRole('radio').first(),
  ])) return;

  const textarea = page.locator('textarea:visible').first();
  if (await textarea.isVisible().catch(() => false)) {
    await textarea.fill('Validação automatizada do fluxo operacional QA.');
    return;
  }

  const textInput = page.locator('input[type="text"]:visible').first();
  if (await textInput.isVisible().catch(() => false)) {
    await textInput.fill('Validação automatizada QA');
    return;
  }

  await page.screenshot({
    path: `${evidenceDir}/prod-operation-e2e-answer-control-missing.png`,
    fullPage: true,
  });
  const error = new Error('QA_EXECUTION_ANSWER_CONTROL_NOT_FOUND');
  error.safePayload = {
    url_path: new URL(page.url()).pathname,
    visible_buttons: await page.locator('button:visible').evaluateAll((buttons) => (
      buttons.slice(0, 20).map((button) => (
        button.innerText.trim() || button.getAttribute('aria-label') || button.title || 'icon-button'
      ))
    )).catch(() => []),
    visible_inputs: await page.locator('input:visible').evaluateAll((inputs) => (
      inputs.slice(0, 20).map((input) => ({
        type: input.type,
        placeholder: input.placeholder,
      }))
    )).catch(() => []),
  };
  throw error;
};

const run = async () => {
  requireEnvironment();
  await mkdir(evidenceDir, { recursive: true });
  const identity = await createOperatorSession();
  const projectRef = new URL(baseUrl).hostname.split('.')[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const result = {
    status: apply ? 'running' : 'dry_run',
    app_url: appUrl,
    qa_workspace_id: identity.workspaceId,
    qa_operator_user_id: identity.authUserId,
    checked_at: new Date().toISOString(),
    steps: [],
  };

  if (!apply) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });
    await context.addInitScript(({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    }, { key: storageKey, value: identity.session });
    const page = await context.newPage();
    const runtimeErrors = [];
    const failedResponses = [];
    page.on('pageerror', (error) => runtimeErrors.push(safeError(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        runtimeErrors.push({ name: 'console', message: message.text().slice(0, 500) });
      }
    });
    page.on('response', async (response) => {
      if (response.status() < 400) return;
      const url = new URL(response.url());
      failedResponses.push({
        status: response.status(),
        host: url.host,
        path: url.pathname,
        body: await response.text().catch(() => '').then((value) => value.slice(0, 500)),
      });
    });

    await page.goto(`${appUrl}/app`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByRole('heading', { name: /Olá,/i }).waitFor({ timeout: 15000 });
    result.steps.push({ step: 'operator_home_loaded', ok: true });

    const cardAction = page.getByRole('button', {
      name: /Ver execução|Começar|Continuar/i,
    }).first();
    await cardAction.waitFor({ timeout: 15000 });
    const card = cardAction.locator('xpath=ancestor::*[self::article or self::li or contains(@class,"card")][1]');
    const cardText = await card.innerText().catch(() => '');
    result.checklist_title = await card.locator('h2, h3').first().innerText().catch(() => '')
      || cardText.split('\n').find((line) => line.trim() && !/^Concluída$/i.test(line.trim()))?.trim()
      || 'QA activity';
    await cardAction.click();
    await page.waitForLoadState('networkidle');

    const executionUrl = new URL(page.url());
    let executionId = executionUrl.searchParams.get('executionId');
    if (!executionId) throw new Error('QA_EXECUTION_ID_NOT_PERSISTED_IN_URL');

    const interactiveWaitStartedAt = Date.now();
    await page.waitForFunction(() => {
      const isVisible = (element) => {
        const style = window.getComputedStyle(element);
        return style.visibility !== 'hidden' && style.display !== 'none';
      };
      const visibleButtons = [...document.querySelectorAll('button')].filter(isVisible);
      const visibleFields = [...document.querySelectorAll('input, textarea')].filter(isVisible);
      const actionable = visibleButtons.length > 1 || visibleFields.length > 0;
      const body = document.body?.innerText || '';
      return actionable || /Não foi possível|Tentar novamente|Erro inesperado/i.test(body);
    }, null, { timeout: 30000 }).catch(async (error) => {
      await page.screenshot({
        path: `${evidenceDir}/prod-operation-e2e-execution-loading-timeout.png`,
        fullPage: true,
      });
      const timeoutError = new Error('QA_EXECUTION_INTERACTIVE_TIMEOUT');
      timeoutError.safePayload = {
        timeout_ms: 30000,
        original_error: String(error?.message || error).slice(0, 300),
      };
      throw timeoutError;
    });
    result.steps.push({
      step: 'execution_became_interactive',
      ok: true,
      elapsed_ms: Date.now() - interactiveWaitStartedAt,
    });

    if (await page.getByRole('button', { name: /Executar novamente/i }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /Executar novamente/i }).click();
      await page.getByRole('button', { name: /Salvar progresso/i }).waitFor({ timeout: 30000 });
      executionId = new URL(page.url()).searchParams.get('executionId');
      if (!executionId) throw new Error('QA_RETRY_EXECUTION_ID_NOT_PERSISTED_IN_URL');
    }
    result.execution_id = executionId;
    result.steps.push({ step: 'execution_started', ok: true, execution_id: executionId });

    await answerFirstItem(page);
    await page.getByRole('button', { name: /Salvar progresso/i }).click();
    await page.getByText(/Progresso salvo/i).waitFor({ timeout: 15000 });
    result.steps.push({ step: 'progress_saved', ok: true });

    await page.reload({ waitUntil: 'networkidle' });
    if (!page.url().includes(`executionId=${executionId}`)) {
      throw new Error('QA_EXECUTION_ID_LOST_AFTER_RELOAD');
    }
    const progressVisible = await page.getByText(/100%/i).first().isVisible().catch(() => false);
    if (!progressVisible) throw new Error('QA_PROGRESS_NOT_RESTORED_AFTER_RELOAD');
    result.steps.push({ step: 'progress_restored_after_reload', ok: true });

    await page.getByRole('button', { name: /Concluir execução/i }).click();
    await page.getByRole('heading', { name: /^Execução concluída$/i }).waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: /Executar novamente/i }).waitFor({ timeout: 15000 });
    result.steps.push({ step: 'execution_completed', ok: true });

    await page.goto(`${appUrl}/app/notifications`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByRole('heading', { name: /^Avisos$/i }).waitFor({ timeout: 15000 });
    await page.getByText(/^Execução concluída$/i).first().waitFor({ timeout: 15000 });
    result.steps.push({ step: 'completion_notification_visible', ok: true });

    await page.goto(`${appUrl}/app/history`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByRole('heading', { name: /Histórico/i }).waitFor({ timeout: 15000 });
    const historyContainsExecution = await page.getByText(result.checklist_title, { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    if (!historyContainsExecution) throw new Error('QA_EXECUTION_NOT_VISIBLE_IN_HISTORY');
    result.steps.push({ step: 'history_reflects_completion', ok: true });

    const [persisted] = await request(
      `/rest/v1/ritmika_responses?select=id,is_finished,qtd_items,qtd_items_answered,metadata,updated_at`
        + `&workspace_id=eq.${identity.workspaceId}&id=eq.${executionId}`,
    );
    if (!persisted?.id || persisted.is_finished !== true) {
      throw new Error('QA_DATABASE_COMPLETION_NOT_PERSISTED');
    }
    const persistedProgress = Number(persisted?.metadata?.progress || 0);
    if (persistedProgress !== 100 || Number(persisted.qtd_items_answered || 0) < 1) {
      throw new Error('QA_DATABASE_PROGRESS_NOT_PERSISTED');
    }
    result.steps.push({
      step: 'database_reflects_completion',
      ok: true,
      is_finished: persisted.is_finished,
      progress: persistedProgress,
      answered: persisted.qtd_items_answered,
      total: persisted.qtd_items,
    });

    await page.goto(`${appUrl}/app`, { waitUntil: 'networkidle', timeout: 60000 });
    const activitySearch = page.getByPlaceholder(/Buscar atividade/i);
    await activitySearch.fill('verificacao');
    await page.getByText(result.checklist_title, { exact: false }).first().waitFor({ timeout: 15000 });
    result.steps.push({ step: 'accent_insensitive_activity_search', ok: true });

    await page.goto(`${appUrl}/checklists`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForURL(/\/app(?:\?|$)/, { timeout: 15000 });
    result.steps.push({ step: 'manager_routes_blocked_for_operator', ok: true });

    await page.goto(`${appUrl}/app/profile`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByRole('heading', { name: /^Meu perfil$/i }).waitFor({ timeout: 15000 });
    await page.getByText(/^Operação$/i).waitFor({ timeout: 15000 });
    result.steps.push({ step: 'operator_profile_loaded', ok: true });

    await page.locator('.employee-danger-button').click();
    await page.waitForURL(/\/login(?:\?|$)/, { timeout: 15000 });
    await page.waitForTimeout(750);
    result.steps.push({ step: 'operator_logout_completed', ok: true });

    result.runtime_errors = runtimeErrors;
    result.failed_responses = failedResponses;
    if (runtimeErrors.length > 0 || failedResponses.length > 0) {
      const runtimeError = new Error('QA_OPERATION_RUNTIME_ERRORS');
      runtimeError.safePayload = {
        runtime_errors: runtimeErrors,
        failed_responses: failedResponses,
      };
      throw runtimeError;
    }
    result.status = 'ok';
    result.completed_at = new Date().toISOString();
    await page.screenshot({
      path: `${evidenceDir}/prod-operation-e2e-completed.png`,
      fullPage: true,
    });
    await context.close();
  } finally {
    await browser.close();
  }

  const outputPath = `${evidenceDir}/production-operation-e2e.json`;
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
};

run().catch(async (error) => {
  const failure = {
    status: 'error',
    checked_at: new Date().toISOString(),
    error: safeError(error),
    detail: error?.safePayload || null,
  };
  await mkdir(evidenceDir, { recursive: true }).catch(() => {});
  await writeFile(
    `${evidenceDir}/production-operation-e2e-error.json`,
    `${JSON.stringify(failure, null, 2)}\n`,
  ).catch(() => {});
  process.stderr.write(`${JSON.stringify(failure, null, 2)}\n`);
  process.exitCode = 1;
});
