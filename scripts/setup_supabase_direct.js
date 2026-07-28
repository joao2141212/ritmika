const https = require('https');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || "";

if (!SUPABASE_URL || !SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_URL_and_modern_SUPABASE_SECRET_KEY_required');
}

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: new URL(SUPABASE_URL).hostname,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_KEY,
                'X-Client-Info': 'ritmika-legacy-bootstrap'
            }
        };

        if (data) {
            options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
        }

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function setup() {
    if (!process.env.RITMIKA_BOOTSTRAP_PASSWORD) {
        throw new Error('RITMIKA_BOOTSTRAP_PASSWORD_required_for_legacy_demo_users');
    }
    console.log('🚀 Setup Supabase Ritmika\n');

    // Create users
    const users = [
        { email: 'pedro@ritmika.com', password: process.env.RITMIKA_BOOTSTRAP_PASSWORD, name: 'Pedro Duarte', role: 'admin' },
        { email: 'cliente@demo', password: process.env.RITMIKA_BOOTSTRAP_PASSWORD, name: 'Cliente Demo', role: 'cliente' },
        { email: 'joao@ritmika.com', password: process.env.RITMIKA_BOOTSTRAP_PASSWORD, name: 'João Silva', role: 'employee' },
        { email: 'maria@ritmika.com', password: process.env.RITMIKA_BOOTSTRAP_PASSWORD, name: 'Maria Santos', role: 'employee' }
    ];

    console.log('👥 Criando usuários...\n');
    for (const user of users) {
        try {
            const result = await makeRequest('POST', '/auth/v1/admin/users', {
                email: user.email,
                password: user.password,
                email_confirm: true,
                user_metadata: {
                    name: user.name
                },
                app_metadata: {
                    role: user.role
                }
            });

            if (result.status >= 200 && result.status < 300) {
                console.log(`✅ ${user.email} criado`);
            } else {
                console.log(`⚠️  ${user.email}: ${result.data.msg || result.data.message || 'erro'}`);
            }
        } catch (error) {
            console.log(`❌ ${user.email}: ${error.message}`);
        }
    }

    // Insert checklists
    console.log('\n📋 Inserindo checklists...\n');
    const checklists = [
        {
            title: 'Abertura de Loja',
            description: 'Procedimentos matinais obrigatórios',
            items: [
                { id: 'i1', text: 'Verificar temperatura do freezer', type: 'text', is_required: true },
                { id: 'i2', text: 'Chão está limpo?', type: 'boolean', is_required: true },
                { id: 'i3', text: 'Foto do balcão', type: 'photo', is_required: false },
                { id: 'i4', text: 'Assinatura do responsável', type: 'signature', is_required: true }
            ]
        },
        {
            title: 'Fechamento de Caixa',
            description: 'Conferência de valores',
            items: [
                { id: 'i5', text: 'Valor em dinheiro confere?', type: 'boolean', is_required: true },
                { id: 'i6', text: 'Cartões processados?', type: 'boolean', is_required: true }
            ]
        },
        {
            title: 'Limpeza Semanal',
            description: 'Checklist profundo de higiene',
            items: [
                { id: 'i9', text: 'Geladeira limpa', type: 'boolean', is_required: true },
                { id: 'i10', text: 'Freezer limpo', type: 'boolean', is_required: true }
            ]
        }
    ];

    for (const checklist of checklists) {
        try {
            const result = await makeRequest('POST', '/rest/v1/checklists', checklist);
            if (result.status === 201) {
                console.log(`✅ ${checklist.title}`);
            } else {
                console.log(`⚠️  ${checklist.title}: ${result.data.message || 'erro'}`);
            }
        } catch (error) {
            console.log(`❌ ${checklist.title}: ${error.message}`);
        }
    }

    console.log('\n✅ Setup concluído!\n');
    console.log('📝 Logins:');
    console.log('   pedro@ritmika.com / senha definida em RITMIKA_BOOTSTRAP_PASSWORD');
    console.log('   cliente@demo / senha definida em RITMIKA_BOOTSTRAP_PASSWORD');
}

setup();
