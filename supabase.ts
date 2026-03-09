
import { createClient } from '@supabase/supabase-js';

// URL y Llaves de Supabase
const supabaseUrl = 'https://oniwkuaxoceulqpkpaag.supabase.co';

// Intentamos usar la Publishable Key, y si no, la Anon JWT Key que proporcionaste
const supabaseAnonKey = 'sb_publishable_qhitvbjdQ-tAkltRPqO9Ew_pQ4-8mOF';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
