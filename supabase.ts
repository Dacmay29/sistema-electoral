
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oniwkuaxoceulqpkpaag.supabase.co';
// Usando la clave anon/public para la conexión
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaXdrdWF4b2NldWxxcGtwYWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjEwNDgsImV4cCI6MjA4ODU5NzA0OH0.Stczi_yO3gWSl2ila2bnG6KZFDPVCWndHk-7v_k9dC8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
