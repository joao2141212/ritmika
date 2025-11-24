const { Client } = require('pg');
const fs = require('fs');

const connectionString = 'postgresql://postgres.bcckaltuxorkybtzskql:Jp9744030249863@aws-1-us-east-2.pooler.supabase.com:6543/postgres';

async function deploy() {
    const client = new Client({ connectionString });
    
    try {
        console.log('🔌 Connecting to Supabase...');
        await client.connect();
        console.log('✅ Connected!\n');

        // Execute Schema
        console.log('📋 Creating schema...');
        const schema = fs.readFileSync('./scripts/supabase_schema.sql', 'utf8');
        await client.query(schema);
        console.log('✅ Schema created\n');

        // Execute Functions
        console.log('🔧 Creating functions...');
        const functions = fs.readFileSync('./scripts/supabase_functions.sql', 'utf8');
        await client.query(functions);
        console.log('✅ Functions created\n');

        // Execute Seed
        console.log('🌱 Inserting seed data...');
        const seed = fs.readFileSync('./scripts/supabase_seed.sql', 'utf8');
        await client.query(seed);
        console.log('✅ Seed data inserted\n');

        console.log('✅ Database setup complete!');
        console.log('\n⚠️  Agora crie os usuários manualmente no Supabase Dashboard:');
        console.log('   Authentication > Users > Add user');
        console.log('\n   pedro@ritmika.com / 123456');
        console.log('   cliente@demo / 123456');
        console.log('   joao@ritmika.com / 123456');
        console.log('   maria@ritmika.com / 123456');
        console.log('\n   Depois execute no SQL Editor:');
        console.log(`
UPDATE public.profiles SET role = 'admin', points = 1250, name = 'Pedro Duarte' WHERE email = 'pedro@ritmika.com';
UPDATE public.profiles SET role = 'cliente', points = 500, name = 'Cliente Demo' WHERE email = 'cliente@demo';
UPDATE public.profiles SET role = 'employee', points = 980, name = 'João Silva' WHERE email = 'joao@ritmika.com';
UPDATE public.profiles SET role = 'employee', points = 850, name = 'Maria Santos' WHERE email = 'maria@ritmika.com';
        `);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.detail) console.error('   Detail:', error.detail);
    } finally {
        await client.end();
    }
}

deploy();
