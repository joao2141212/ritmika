const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://bcckaltuxorkybtzskql.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjY2thbHR1eG9ya3lidHpza3FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjQ4NDAxNywiZXhwIjoyMDQ4MDYwMDE3fQ.4GZ_TSGctt4RkA5LRwrmtg_5JT6YRHh';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
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
            { email: 'pedro@ritmika.com', password: '123456', name: 'Pedro Duarte', role: 'admin', points: 1250 },
            { email: 'cliente@demo', password: '123456', name: 'Cliente Demo', role: 'cliente', points: 500 },
            { email: 'joao@ritmika.com', password: '123456', name: 'João Silva', role: 'employee', points: 980 },
            { email: 'maria@ritmika.com', password: '123456', name: 'Maria Santos', role: 'employee', points: 850 }
        ];

        for (const user of users) {
            const { data, error } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true,
                user_metadata: {
                    name: user.name,
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
        console.log('   - pedro@ritmika.com / 123456 (Admin)');
        console.log('   - cliente@demo / 123456 (Cliente)');
        console.log('   - joao@ritmika.com / 123456 (Funcionário)');
        console.log('   - maria@ritmika.com / 123456 (Funcionária)');

    } catch (error) {
        console.error('❌ Erro durante setup:', error);
    }
}

setupDatabase();
