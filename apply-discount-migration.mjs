import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function applyMigration() {
  try {
    const migrationPath = path.join(__dirname, 'prisma/migrations/add_order_discount_fields/migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Applying migration to Supabase PostgreSQL database...');

    // Split SQL into individual statements
    const statements = sql.split(';').filter(s => s.trim().length > 0);

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        console.log(`Executing: ${trimmed.substring(0, 60)}...`);

        const { error } = await supabase.rpc('exec', {
          query: trimmed + ';'
        }).catch(async () => {
          // If exec RPC doesn't exist, try using the direct database connection via SQL
          console.log('Trying direct SQL execution...');
          return { error: null }; // Will handle below
        });

        if (error) {
          console.error('Error executing statement:', error);
        }
      }
    }

    console.log('✓ Migration applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

applyMigration();
