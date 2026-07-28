const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SECRET_KEY || "";

if (!supabaseUrl || !supabaseKey.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_URL_and_modern_SUPABASE_SECRET_KEY_required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const logger = require('./lib/logger');

async function setupDatabase() {
    if (!process.env.RITMIKA_BOOTSTRAP_PASSWORD) {
        throw new Error('RITMIKA_BOOTSTRAP_PASSWORD_required_for_legacy_demo_users');
    }
    console.log('🚀 Iniciando setup do Supabase...\n');

    // Read SQL files
    const schema = fs.readFileSync('./supabase_schema.sql', 'utf8');
    const functions = fs.readFileSync('./supabase_functions.sql', 'utf8');
    const seed = fs.readFileSync('./supabase_seed.sql', 'utf8');

    try {
        // Execute schema
        console.log('📋 Criando tabelas e policies...');
        const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schema });
        if (schemaError) {
            console.log('⚠️  Schema já existe ou erro:', schemaError.message);
        } else {
            console.log('✅ Schema criado com sucesso!');
        }

        // Execute functions
        console.log('\n🔧 Criando funções...');
        const { error: funcError } = await supabase.rpc('exec_sql', { sql: functions });
        if (funcError) {
            console.log('⚠️  Funções já existem ou erro:', funcError.message);
        } else {
            console.log('✅ Funções criadas com sucesso!');
        }

        // Execute seed
        console.log('\n🌱 Inserindo dados iniciais...');
        const { error: seedError } = await supabase.rpc('exec_sql', { sql: seed });
        if (seedError) {
            console.log('⚠️  Dados já existem ou erro:', seedError.message);
        } else {
            console.log('✅ Dados inseridos com sucesso!');
        }

        // Create demo users
        console.log('\n👥 Criando usuários demo...');
        
        const users = [
            { email: 'pedro@ritmika.com', password: process.env.RITMIKA_BOOTSTRAP_PASSWORD, name: 'Pedro Duarte', role: 'admin', points: 1250 },
            { email: 'cliente@demo', password: process.env.RITMIKA_BOOTSTRAP_PASSWORD, name: 'Cliente Demo', role: 'cliente', points: 500 },
            { email: 'joao@ritmika.com', password: process.env.RITMIKA_BOOTSTRAP_PASSWORD, name: 'João Silva', role: 'employee', points: 980 },
            { email: 'maria@ritmika.com', password: process.env.RITMIKA_BOOTSTRAP_PASSWORD, name: 'Maria Santos', role: 'employee', points: 850 }
        ];

        for (const user of users) {
            const { data, error } = await supabase.auth.admin.createUser({
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

            if (error) {
                console.log(`⚠️  ${user.email}: ${error.message}`);
            } else {
                console.log(`✅ ${user.email} criado!`);
                
                // Update profile with points
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ points: user.points, name: user.name, role: user.role })
                    .eq('email', user.email);

                if (updateError) {
                    console.log(`   ⚠️  Erro ao atualizar pontos: ${updateError.message}`);
                }
            }
        }

        console.log('\n✅ Setup completo! Aplicação pronta para uso.');
        console.log('\n📝 Logins disponíveis:');
        console.log('   - pedro@ritmika.com / senha definida em RITMIKA_BOOTSTRAP_PASSWORD (Admin)');
        console.log('   - cliente@demo / senha definida em RITMIKA_BOOTSTRAP_PASSWORD (Cliente)');
        console.log('   - joao@ritmika.com / senha definida em RITMIKA_BOOTSTRAP_PASSWORD (Funcionário)');
        console.log('   - maria@ritmika.com / senha definida em RITMIKA_BOOTSTRAP_PASSWORD (Funcionária)');

    } catch (error) {
        logger.error({
            file: 'scripts/setup_supabase.js',
            functionName: 'setupDatabase',
            operation: 'legacy-supabase-setup',
            error,
            errorCode: error.code || 'LEGACY_SUPABASE_SETUP_FAILED',
        });
        throw error;
    }
}

setupDatabase();
