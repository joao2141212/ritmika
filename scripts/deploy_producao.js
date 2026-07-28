const { Client } = require('pg');
const fs = require('fs');

const connectionString = process.env.SUPABASE_DB_URL || "";

async function deploy() {
    if (!connectionString) throw new Error('SUPABASE_DB_URL_required');
    const client = new Client({ connectionString });
    
    try {
        console.log('🔌 Connecting to Supabase...');
        await client.connect();
        console.log('✅ Connected!\n');

        // Execute Schema de Produção
        console.log('📋 Creating production schema...');
        const schema = fs.readFileSync('./scripts/supabase_schema_producao.sql', 'utf8');
        await client.query(schema);
        console.log('✅ Production schema created\n');

        // Execute Seed de Produção
        console.log('🌱 Inserting production data (74 Cozinha + 27 Bebidas)...');
        const seed = fs.readFileSync('./scripts/supabase_seed_producao.sql', 'utf8');
        await client.query(seed);
        console.log('✅ Production data inserted\n');

        console.log('✅ Production database setup complete!');
        console.log('\n📊 Dados inseridos:');
        console.log('   ✅ Checklist Cozinha: 74 produtos');
        console.log('   ✅ Checklist Bebidas: 27 produtos');
        console.log('\n🎯 Próximos passos:');
        console.log('   1. Criar usuários no Supabase Dashboard');
        console.log('   2. Atualizar interface para novos checklists');
        console.log('   3. Testar fluxo de contagem');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.detail) console.error('   Detail:', error.detail);
    } finally {
        await client.end();
    }
}

deploy();
