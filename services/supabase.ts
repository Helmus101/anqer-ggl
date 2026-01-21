
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://slgosstxdxymrkjbrczj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZ29zc3R4ZHh5bXJramJyY3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjQ4NTcsImV4cCI6MjA4NDYwMDg1N30.x5Y4rIoyEYwIKkwiwhpYjlbuiYR0kKuzuxdqZpupalI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
