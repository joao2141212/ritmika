const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'https://bcckaltuxorkybtzskql.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjY2thbHR1eG9ya3lidHpza3FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjQ4NDAxNywiZXhwIjoyMDQ4MDYwMDE3fQ.4GZ_TSGctt4RkA5LRwrmtg_5JT6YRHh';

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'bcckaltuxorkybtzskql.supabase.co',
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`
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
    console.log('🚀 Setup Supabase Ritmika\n');

    // Create users
    const users = [
        { email: 'pedro@ritmika.com', password: '123456', name: 'Pedro Duarte', role: 'admin' },
        { email: 'cliente@demo', password: '123456', name: 'Cliente Demo', role: 'cliente' },
        { email: 'joao@ritmika.com', password: '123456', name: 'João Silva', role: 'employee' },
        { email: 'maria@ritmika.com', password: '123456', name: 'Maria Santos', role: 'employee' }
    ];

    console.log('👥 Criando usuários...\n');
    for (const user of users) {
        try {
            const result = await makeRequest('POST', '/auth/v1/admin/users', {
                email: user.email,
                password: user.password,
                email_confirm: true,
                user_metadata: {
                    name: user.name,
                    role: user.role
                }
            });

            if (result.status === 200 || result.status === 201) {
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
    console.log('   pedro@ritmika.com / 123456');
    console.log('   cliente@demo / 123456');
}

setup();
