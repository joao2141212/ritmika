const https = require('https');
const fs = require('fs');

const PROJECT_REF = 'bcckaltuxorkybtzskql';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjY2thbHR1eG9ya3lidHpza3FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjQ4NDAxNywiZXhwIjoyMDQ4MDYwMDE3fQ.4GZ_TSGctt4RkA5LRwrmtg_5JT6YRHh';
const DB_PASSWORD = 'Jp9744030249863';

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
                'Authorization': `Bearer ${SERVICE_KEY}`,
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
            user_metadata: metadata
        });
        
        const options = {
            hostname: `${PROJECT_REF}.supabase.co`,
            path: '/auth/v1/admin/users',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
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

async function deploy() {
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
        { email: 'pedro@ritmika.com', password: '123456', metadata: { name: 'Pedro Duarte', role: 'admin' } },
        { email: 'cliente@demo', password: '123456', metadata: { name: 'Cliente Demo', role: 'cliente' } },
        { email: 'joao@ritmika.com', password: '123456', metadata: { name: 'João Silva', role: 'employee' } },
        { email: 'maria@ritmika.com', password: '123456', metadata: { name: 'Maria Santos', role: 'employee' } }
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
    console.log('   pedro@ritmika.com / 123456');
    console.log('   cliente@demo / 123456');
}

deploy().catch(console.error);
