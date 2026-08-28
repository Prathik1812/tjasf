// Initialized Supabase client for project okzfawdbeisjrqwiwyso
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://okzfawdbeisjrqwiwyso.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9remZhd2RiZWlzanJxd2l3eXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MDU2NjEsImV4cCI6MjEwMzQ4MTY2MX0.n5NAkP93fgq4dYhmkdPpgwi070DM0C5TLtWmUnTpqTw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
