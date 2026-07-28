const https = require('https');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const PROJECT_REF = SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split('.')[0] : '';
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || "";
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || "";

if (!SUPABASE_URL || !SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_URL_and_modern_SUPABASE_SECRET_KEY_required');
}

function execSQL(sql) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ query: sql });
        
        const options = {
            hostname: `${PROJECT_REF}.supabase.co`,
            path: '/rest/v1/rpc/exec_sql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_KEY,
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ success: true, data: body });
                } else {
                    resolve({ success: false, error: body, status: res.statusCode });
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function createUser(email, password, metadata) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            email,
            password,
            email_confirm: true,
            app_metadata: metadata
        });
        
        const options = {
            hostname: `${PROJECT_REF}.supabase.co`,
            path: '/auth/v1/admin/users',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_KEY,
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ success: true, data: parsed });
                    } else {
                        resolve({ success: false, error: parsed, status: res.statusCode });
                    }
                } catch (e) {
                    resolve({ success: false, error: body, status: res.statusCode });
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

const logger = require('./lib/logger');

async function deploy() {
    if (!process.env.RITMIKA_BOOTSTRAP_PASSWORD) {
        throw new Error('RITMIKA_BOOTSTRAP_PASSWORD_required_for_legacy_demo_users');
    }
    try {
    console.log('🚀 Deploying to Supabase...\n');

    // 1. Execute Schema
    console.log('📋 Creating schema...');
    const schema = fs.readFileSync('./scripts/supabase_schema.sql', 'utf8');
    const schemaResult = await execSQL(schema);
    console.log(schemaResult.success ? '✅ Schema created' : `⚠️  ${schemaResult.error}`);

    // 2. Execute Functions
    console.log('\n🔧 Creating functions...');
    const functions = fs.readFileSync('./scripts/supabase_functions.sql', 'utf8');
    const funcResult = await execSQL(functions);
    console.log(funcResult.success ? '✅ Functions created' : `⚠️  ${funcResult.error}`);

    // 3. Create Users
    console.log('\n👥 Creating users...');
    const users = [
        { email: 'pedro@ritmika.com', password: process.env.RITMIKA_BOOTSTRAP_PASSWORD, metadata: { name: 'Pedro Duarte', role: 'admin' } },
        { email: 'cliente@demo', password: process.env.RITMIKA_BOOTSTRAP_PASSWORD, metadata: { name: 'Cliente Demo', role: 'cliente' } },
        { email: 'joao@ritmika.com', password: process.env.RITMIKA_BOOTSTRAP_PASSWORD, metadata: { name: 'João Silva', role: 'employee' } },
        { email: 'maria@ritmika.com', password: process.env.RITMIKA_BOOTSTRAP_PASSWORD, metadata: { name: 'Maria Santos', role: 'employee' } }
    ];

    for (const user of users) {
        const result = await createUser(user.email, user.password, user.metadata);
        if (result.success) {
            console.log(`✅ ${user.email}`);
            
            // Update profile
            const updateSQL = `
                UPDATE public.profiles 
                SET role = '${user.metadata.role}', 
                    name = '${user.metadata.name}',
                    points = ${user.metadata.role === 'admin' ? 1250 : user.metadata.role === 'cliente' ? 500 : 850}
                WHERE email = '${user.email}';
            `;
            await execSQL(updateSQL);
        } else {
            console.log(`⚠️  ${user.email}: ${result.error?.msg || result.error?.message || 'error'}`);
        }
    }

    // 4. Insert Seed Data
    console.log('\n🌱 Inserting seed data...');
    const seed = fs.readFileSync('./scripts/supabase_seed.sql', 'utf8');
    const seedResult = await execSQL(seed);
    console.log(seedResult.success ? '✅ Seed data inserted' : `⚠️  ${seedResult.error}`);

    console.log('\n✅ Deployment complete!');
    console.log('\n📝 Test logins:');
    console.log('   pedro@ritmika.com / senha definida em RITMIKA_BOOTSTRAP_PASSWORD');
    console.log('   cliente@demo / senha definida em RITMIKA_BOOTSTRAP_PASSWORD');
    } catch (error) {
        logger.error({
            file: 'scripts/deploy_supabase.js',
            functionName: 'deploy',
            operation: 'legacy-supabase-deploy',
            error,
            errorCode: error.code || 'LEGACY_SUPABASE_DEPLOY_FAILED',
        });
        throw error;
    }
}

deploy().catch(console.error);
