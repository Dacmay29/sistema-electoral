
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oniwkuaxoceulqpkpaag.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaXdrdWF4b2NldWxxcGtwYWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjEwNDgsImV4cCI6MjA4ODU5NzA0OH0.Stczi_yO3gWSl2ila2bnG6KZFDPVCWndHk-7v_k9dC8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
