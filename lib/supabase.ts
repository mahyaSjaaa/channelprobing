import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus diatur di .env.local');
}

// Server-only module: jangan import file ini dari Client Component.
export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
