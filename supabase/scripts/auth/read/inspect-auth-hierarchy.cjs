#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const required = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  process.stderr.write(`${JSON.stringify({
    fn: 'inspectAuthHierarchy',
    status: 'error',
    errorCode: 'MISSING_ENV',
    missing,
  })}\n`);
  process.exit(2);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

async function listAllUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw error;

    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < 100) return users;
    page += 1;
  }
}

async function inspectAuthHierarchy() {
  const [users, membershipsResult, workspacesResult] = await Promise.all([
    listAllUsers(),
    supabase
      .from('ritmika_workspace_members')
      .select('user_id,workspace_id,role,is_owner,managed_units,preferences'),
    supabase
      .from('ritmika_workspaces')
      .select('id,name,source_system,created_at'),
  ]);

  if (membershipsResult.error) throw membershipsResult.error;
  if (workspacesResult.error) throw workspacesResult.error;

  const membershipsByUser = new Map();
  for (const membership of membershipsResult.data || []) {
    const current = membershipsByUser.get(membership.user_id) || [];
    current.push(membership);
    membershipsByUser.set(membership.user_id, current);
  }

  const workspaceById = new Map(
    (workspacesResult.data || []).map((workspace) => [workspace.id, workspace]),
  );

  const hierarchy = users.map((user) => ({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    memberships: (membershipsByUser.get(user.id) || []).map((membership) => ({
      ...membership,
      workspace: workspaceById.get(membership.workspace_id) || null,
    })),
  }));

  process.stdout.write(`${JSON.stringify({
    status: 'ok',
    user_count: hierarchy.length,
    workspace_count: workspaceById.size,
    users: hierarchy,
  }, null, 2)}\n`);
}

inspectAuthHierarchy().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    fn: 'inspectAuthHierarchy',
    status: 'error',
    errorCode: error?.code || 'AUTH_HIERARCHY_INSPECTION_FAILED',
    error: error instanceof Error ? error.message : String(error),
  })}\n`);
  process.exit(1);
});
