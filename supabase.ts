
import { createClient } from '@supabase/supabase-js';

// Prioridad: 1. Variables de entorno (Vercel), 2. Clave Publicable (sb_publishable), 3. JWT Tradicional
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oniwkuaxoceulqpkpaag.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_qhitvbjdQ-tAkltRPqO9Ew_pQ4-8mOF';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
