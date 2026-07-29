import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
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
const evidenceFixturePath = fileURLToPath(new URL('../fixtures/qa-evidence.svg', import.meta.url));
const apply = process.argv.includes('--apply');

const safeError = (error) => ({
  name: error?.name || 'Error',
  message: String(error?.message || error),
  stack: String(error?.stack || '').split('\n').slice(0, 5),
});

const request = async (path, {
  method = 'GET',
  body,
  key = secretKey,
  prefer = '',
} = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
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

const requestWithSession = async (path, accessToken) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`session_http_${response.status}`);
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

const createSessionForMembership = async ({ workspaceId, membershipFilter, missingCode }) => {
  const [membership] = await request(
    `/rest/v1/ritmika_workspace_members?select=user_id,role,is_owner`
      + `&workspace_id=eq.${workspaceId}&${membershipFilter}&limit=1`,
  );
  if (!membership?.user_id) throw new Error(missingCode);

  const authUser = await request(`/auth/v1/admin/users/${membership.user_id}`);
  if (!authUser?.email) throw new Error(`${missingCode}_AUTH_EMAIL_NOT_FOUND`);

  const [profile] = await request(
    `/rest/v1/ritmika_profiles?select=*&workspace_id=eq.${workspaceId}`
      + `&auth_user_id=eq.${membership.user_id}&limit=1`,
  );
  if (!profile?.id) throw new Error(`${missingCode}_PROFILE_NOT_FOUND`);

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
    workspaceId,
    authUserId: membership.user_id,
    membership,
    profile,
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

const createQaSessions = async () => {
  const [workspace] = await request(
    '/rest/v1/ritmika_workspaces?select=id,source_system&source_system=eq.ritmika_qa',
  );
  if (!workspace?.id) throw new Error('QA_WORKSPACE_NOT_FOUND');

  const operator = await createSessionForMembership({
    workspaceId: workspace.id,
    membershipFilter: 'role=eq.operator&is_owner=eq.false',
    missingCode: 'QA_OPERATOR_NOT_FOUND',
  });
  const manager = await createSessionForMembership({
    workspaceId: workspace.id,
    membershipFilter: 'is_owner=eq.true',
    missingCode: 'QA_MANAGER_NOT_FOUND',
  });

  return { workspaceId: workspace.id, operator, manager };
};

const installSession = async (context, storageKey, identity) => {
  await context.addInitScript(({ key, value, userId, workspaceId }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.localStorage.setItem(`ritmika.activeWorkspaceId.${userId}`, workspaceId);
  }, {
    key: storageKey,
    value: identity.session,
    userId: identity.authUserId,
    workspaceId: identity.workspaceId,
  });
};

const ensureCapabilityFixture = async ({ workspaceId, authUserId }) => {
  const [profile] = await request(
    `/rest/v1/ritmika_profiles?select=id&workspace_id=eq.${workspaceId}`
      + `&auth_user_id=eq.${authUserId}&limit=1`,
  );
  if (!profile?.id) throw new Error('QA_OPERATOR_PROFILE_NOT_FOUND');

  const sourceId = 'qa-operation-capabilities-v1';
  const fixture = {
    workspace_id: workspaceId,
    source_id: sourceId,
    title: 'QA · Capacidades operacionais',
    description: 'Fixture QA para validar resposta, comentário, data, número e evidência fotográfica.',
    status: 'active',
    checklist_kind: 'operational',
    responsible_profile_id: profile.id,
    schedule: {},
    variables: {},
    metadata: { qa_fixture: true, capability_contract: 'operation-v2' },
    items: [
      {
        id: 'qa-capability-check',
        type: 'check',
        title: 'Confirmar execução da rotina',
        description: 'Marque como feito e anexe a evidência obrigatória.',
        order: 0,
        required: true,
        is_required: true,
        evidences: [{ name: 'Foto da validação', type: 'image', is_required: true }],
      },
      {
        id: 'qa-capability-comment',
        type: 'text',
        title: 'Comentário da execução',
        description: 'Registre o contexto operacional.',
        order: 1,
        required: true,
        is_required: true,
        evidences: [],
      },
      {
        id: 'qa-capability-datetime',
        type: 'datetime',
        title: 'Momento da verificação',
        description: 'Informe a data e hora observadas.',
        order: 2,
        required: true,
        is_required: true,
        evidences: [],
      },
      {
        id: 'qa-capability-numeric',
        type: 'numeric',
        title: 'Temperatura aferida',
        description: 'Informe o valor observado com até três casas decimais.',
        order: 3,
        required: true,
        is_required: true,
        evidences: [],
      },
    ],
  };

  const [existing] = await request(
    `/rest/v1/ritmika_checklists?select=id,title&workspace_id=eq.${workspaceId}`
      + `&source_id=eq.${sourceId}&limit=1`,
  );
  const persisted = existing?.id
    ? await request(
      `/rest/v1/ritmika_checklists?id=eq.${existing.id}&workspace_id=eq.${workspaceId}&select=id,title`,
      {
        method: 'PATCH',
        body: fixture,
        prefer: 'return=representation',
      },
    )
    : await request('/rest/v1/ritmika_checklists?select=id,title', {
      method: 'POST',
      body: fixture,
      prefer: 'return=representation',
    });
  const [checklist] = persisted;
  if (!checklist?.id) throw new Error('QA_CAPABILITY_FIXTURE_NOT_PERSISTED');
  return checklist;
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

const answerCapabilityItems = async (page) => {
  const doneButtons = page.getByRole('button', { name: /^Feito$/i });
  for (let index = 0; index < await doneButtons.count(); index += 1) {
    await doneButtons.nth(index).click();
  }

  const textareas = page.locator('textarea:visible');
  for (let index = 0; index < await textareas.count(); index += 1) {
    await textareas.nth(index).fill('Comentário operacional validado em produção.');
  }

  const datetimeFields = page.locator('input[type="datetime-local"]:visible');
  if (await datetimeFields.count() < 1) throw new Error('QA_DATETIME_CONTROL_NOT_FOUND');
  await datetimeFields.first().fill('2026-07-29T12:00');

  const numericField = page.getByRole('spinbutton', { name: 'Temperatura aferida' });
  if (await numericField.count() !== 1) throw new Error('QA_NUMERIC_CONTROL_NOT_FOUND');
  if (await numericField.getAttribute('step') !== '0.001') {
    throw new Error('QA_NUMERIC_PRECISION_CONTRACT_MISSING');
  }
  if (await numericField.getAttribute('inputmode') !== 'decimal') {
    throw new Error('QA_NUMERIC_KEYBOARD_CONTRACT_MISSING');
  }
  await numericField.fill('12.345');

  const fileFields = page.locator('input[type="file"]');
  if (await fileFields.count() < 1) throw new Error('QA_EVIDENCE_UPLOAD_CONTROL_NOT_FOUND');
  await fileFields.first().setInputFiles(evidenceFixturePath);
  await page.getByText(/Evidência anexada/i).waitFor({ timeout: 30000 });
};

const run = async () => {
  requireEnvironment();
  await mkdir(evidenceDir, { recursive: true });
  const identities = await createQaSessions();
  const identity = identities.operator;
  const capabilityFixture = apply ? await ensureCapabilityFixture(identity) : null;
  const projectRef = new URL(baseUrl).hostname.split('.')[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const result = {
    status: apply ? 'running' : 'dry_run',
    app_url: appUrl,
    qa_workspace_id: identity.workspaceId,
    qa_operator_user_id: identity.authUserId,
    qa_manager_user_id: identities.manager.authUserId,
    checked_at: new Date().toISOString(),
    steps: [],
    fixture_checklist_id: capabilityFixture?.id || null,
  };

  if (!apply) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  try {
    const runtimeErrors = [];
    const failedResponses = [];
    const managerReferenceResponses = [];
    const instrumentPage = (page, audience) => {
      page.on('pageerror', (error) => runtimeErrors.push({ audience, ...safeError(error) }));
      page.on('console', (message) => {
        if (message.type() === 'error') {
          runtimeErrors.push({
            audience,
            name: 'console',
            message: message.text().slice(0, 500),
          });
        }
      });
      page.on('response', async (response) => {
        const url = new URL(response.url());
        if (audience === 'manager' && url.pathname.endsWith('/rest/v1/ritmika_profiles')) {
          const payload = await response.json().catch(() => []);
          managerReferenceResponses.push({
            status: response.status(),
            count: Array.isArray(payload) ? payload.length : null,
            ids: Array.isArray(payload) ? payload.map((profile) => profile.id).filter(Boolean) : [],
          });
        }
        if (response.status() < 400) return;
        failedResponses.push({
          audience,
          status: response.status(),
          host: url.host,
          path: url.pathname,
          body: await response.text().catch(() => '').then((value) => value.slice(0, 500)),
        });
      });
    };

    const checklistTitle = `QA · Verificação fim a fim ${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12)}`;
    const managerVisibleProfiles = await requestWithSession(
      `/rest/v1/ritmika_profiles?select=id,auth_user_id,role&workspace_id=eq.${identity.workspaceId}`,
      identities.manager.session.access_token,
    );
    if (!managerVisibleProfiles.some((profile) => profile.id === identity.profile.id)) {
      const visibilityError = new Error('QA_MANAGER_CANNOT_READ_ASSIGNED_OPERATOR_PROFILE');
      visibilityError.safePayload = {
        workspace_id: identity.workspaceId,
        expected_profile_id: identity.profile.id,
        visible_profile_count: managerVisibleProfiles.length,
      };
      throw visibilityError;
    }
    result.steps.push({
      step: 'manager_can_read_operator_profile',
      ok: true,
      visible_profile_count: managerVisibleProfiles.length,
    });

    const managerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await installSession(managerContext, storageKey, identities.manager);
    const managerPage = await managerContext.newPage();
    instrumentPage(managerPage, 'manager');

    await managerPage.goto(`${appUrl}/checklists/new`, { waitUntil: 'networkidle', timeout: 60000 });
    await managerPage.getByRole('heading', { name: /^Novo checklist$/i, level: 1 })
      .waitFor({ timeout: 15000 });
    result.steps.push({ step: 'manager_builder_loaded', ok: true });

    await managerPage.getByLabel(/^Título$/i).fill(checklistTitle);
    await managerPage.getByLabel(/^Descrição$/i).fill(
      'Fixture QA criada pelo fluxo real de gestão e destinada ao produto operacional.',
    );
    await managerPage.getByLabel(/^Título do item$/i).first().fill('Confirmar verificação operacional');
    await managerPage.getByLabel(/^Evidência$/i).first().fill('Comprovante da verificação');
    await managerPage.getByLabel(/Exigir evidência/i).first().check();
    const responsibleSelect = managerPage.getByLabel(/Responsável padrão/i);
    await responsibleSelect.locator(`option[value="${identity.profile.id}"]`)
      .waitFor({ state: 'attached', timeout: 30000 })
      .catch(async (error) => {
        const referencesError = new Error('QA_OPERATOR_NOT_AVAILABLE_IN_MANAGER_ASSIGNMENT');
        referencesError.safePayload = {
          expected_profile_id: identity.profile.id,
          available_options: await responsibleSelect.locator('option').count().catch(() => 0),
          reference_responses: managerReferenceResponses,
          manager_runtime_errors: runtimeErrors.filter((entry) => entry.audience === 'manager'),
          manager_failed_responses: failedResponses.filter((response) => response.audience === 'manager'),
          original_error: String(error?.message || error).slice(0, 300),
        };
        throw referencesError;
      });
    await responsibleSelect.selectOption(identity.profile.id);
    result.steps.push({
      step: 'manager_assignment_selected',
      ok: true,
      responsible_profile_id: identity.profile.id,
    });

    await managerPage.getByRole('button', { name: /Publicar/i }).click();
    await managerPage.waitForURL(/\/checklists(?:\?|$)/, { timeout: 30000 });
    await managerPage.getByText(checklistTitle, { exact: false }).first().waitFor({ timeout: 15000 });

    const encodedTitle = encodeURIComponent(checklistTitle);
    const [createdChecklist] = await request(
      `/rest/v1/ritmika_checklists?select=*&workspace_id=eq.${identity.workspaceId}`
        + `&title=eq.${encodedTitle}&order=created_at.desc&limit=1`,
    );
    if (!createdChecklist?.id) throw new Error('QA_MANAGER_CHECKLIST_NOT_PERSISTED');
    if (createdChecklist.responsible_profile_id !== identity.profile.id) {
      const assignmentError = new Error('QA_MANAGER_ASSIGNMENT_NOT_PERSISTED');
      assignmentError.safePayload = {
        checklist_id: createdChecklist.id,
        expected_profile_id: identity.profile.id,
        persisted_profile_id: createdChecklist.responsible_profile_id || null,
      };
      throw assignmentError;
    }
    result.checklist_id = createdChecklist.id;
    result.checklist_title = checklistTitle;
    result.steps.push({
      step: 'manager_checklist_published',
      ok: true,
      checklist_id: createdChecklist.id,
    });
    await managerContext.close();

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });
    await installSession(context, storageKey, identity);
    const page = await context.newPage();
    instrumentPage(page, 'operation');

    await page.goto(`${appUrl}/app`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByRole('heading', { name: /Olá,/i }).waitFor({ timeout: 15000 });
    result.steps.push({ step: 'operator_home_loaded', ok: true });

    const targetCard = page.getByText(checklistTitle, { exact: false })
      .first()
      .locator('xpath=ancestor::article[1]');
    await targetCard.waitFor({ timeout: 15000 });
    const cardAction = targetCard.getByRole('button', {
      name: /Abrir atividade|Revisar execução|Ver execução|Começar|Continuar/i,
    }).first();
    await cardAction.waitFor({ timeout: 15000 }).catch(async (error) => {
      await page.screenshot({
        path: `${evidenceDir}/prod-operation-e2e-target-action-missing.png`,
        fullPage: true,
      });
      const actionError = new Error('QA_ASSIGNED_ACTIVITY_ACTION_NOT_FOUND');
      actionError.safePayload = {
        title: checklistTitle,
        card_text: await targetCard.innerText().catch(() => ''),
        visible_buttons: await targetCard.locator('button:visible').allTextContents().catch(() => []),
        original_error: String(error?.message || error).slice(0, 300),
      };
      throw actionError;
    });
    await cardAction.click();
    await page.waitForLoadState('networkidle');

    const executionUrl = new URL(page.url());
    let executionId = executionUrl.searchParams.get('executionId');

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
    if (!executionId) {
      await page.waitForFunction(() => new URL(window.location.href).searchParams.has('executionId'), null, {
        timeout: 15000,
      }).catch(async (error) => {
        const executionIdError = new Error('QA_EXECUTION_ID_NOT_PERSISTED_IN_URL');
        executionIdError.safePayload = {
          url_path: new URL(page.url()).pathname,
          query: new URL(page.url()).search,
          body_excerpt: await page.locator('body').innerText().then((value) => value.slice(0, 700)).catch(() => ''),
          original_error: String(error?.message || error).slice(0, 300),
        };
        throw executionIdError;
      });
      executionId = new URL(page.url()).searchParams.get('executionId');
    }
    result.execution_id = executionId;
    result.steps.push({ step: 'execution_started', ok: true, execution_id: executionId });

    await answerFirstItem(page);
    await page.getByRole('button', { name: /Concluir execução/i }).click();
    await page.getByText(/Anexe as evidências obrigatórias/i).waitFor({ timeout: 15000 });
    result.steps.push({ step: 'required_evidence_blocks_completion', ok: true });

    await page.locator('input[type="file"]').first().setInputFiles(evidenceFixturePath);
    await page.getByText(/Evidências \(1\)/i).waitFor({ timeout: 30000 });
    result.steps.push({ step: 'required_evidence_uploaded', ok: true });

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
    const capabilityCard = page.getByText(capabilityFixture.title, { exact: false })
      .first()
      .locator('xpath=ancestor::article[1]');
    await capabilityCard.waitFor({ timeout: 15000 });
    await capabilityCard.getByRole('button', {
      name: /Abrir atividade|Revisar execução|Ver execução|Começar|Continuar/i,
    }).first().click();
    await page.getByRole('button', { name: /Salvar progresso|Executar novamente/i })
      .first()
      .waitFor({ timeout: 30000 });

    if (await page.getByRole('button', { name: /Executar novamente/i }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /Executar novamente/i }).click();
      await page.getByRole('button', { name: /Salvar progresso/i }).waitFor({ timeout: 30000 });
    }
    await page.waitForFunction(() => new URL(window.location.href).searchParams.has('executionId'), null, {
      timeout: 15000,
    });
    const capabilityExecutionId = new URL(page.url()).searchParams.get('executionId');
    if (!capabilityExecutionId) throw new Error('QA_CAPABILITY_EXECUTION_ID_NOT_PERSISTED');

    await answerCapabilityItems(page);
    await page.getByRole('button', { name: /Salvar progresso/i }).click();
    await page.getByText(/Progresso salvo/i).waitFor({ timeout: 15000 });
    await page.reload({ waitUntil: 'networkidle' });
    if (!page.url().includes(`executionId=${capabilityExecutionId}`)) {
      throw new Error('QA_CAPABILITY_EXECUTION_ID_LOST_AFTER_RELOAD');
    }
    await page.getByText(/100%/i).first().waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: /Concluir execução/i }).click();
    await page.getByRole('heading', { name: /^Execução concluída$/i }).waitFor({ timeout: 15000 });

    const [persistedCapability] = await request(
      `/rest/v1/ritmika_responses?select=id,is_finished,qtd_items,qtd_items_answered,metadata,updated_at`
        + `&workspace_id=eq.${identity.workspaceId}&id=eq.${capabilityExecutionId}`,
    );
    if (!persistedCapability?.id || persistedCapability.is_finished !== true) {
      throw new Error('QA_CAPABILITY_COMPLETION_NOT_PERSISTED');
    }
    if (Number(persistedCapability.qtd_items_answered || 0) < 4) {
      throw new Error('QA_CAPABILITY_ANSWERS_NOT_PERSISTED');
    }
    result.steps.push({
      step: 'capability_fixture_completed',
      ok: true,
      execution_id: capabilityExecutionId,
      answered: persistedCapability.qtd_items_answered,
      total: persistedCapability.qtd_items,
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
