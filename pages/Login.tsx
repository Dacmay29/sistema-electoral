
import React, { useState } from 'react';
import { User, Role } from '../types';
import { getDB, saveDB } from '../db';
import { supabase } from '../supabase';
import { ShieldCheck, UserCircle, KeyRound, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [document, setDocument] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Unified Login Logic (Local + Cloud)
    const db = getDB();
    const localUser = db.users.find(u => u.document === document);

    if (localUser) {
      if (localUser.status === 'Inactivo') {
        setError('Este usuario ha sido deshabilitado.');
      } else {
        onLogin(localUser);
      }
      setIsLoading(false);
    } else {
      // Intentar buscar en Supabase en tiempo real
      const performCloudLogin = async () => {
        try {
          const { data, error: sbError } = await supabase.from('users').select('*').eq('document', document).single();

          if (data) {
            const newUser: User = {
              id: data.id,
              name: data.name,
              document: data.document,
              role: data.role as Role,
              grade: data.grade,
              section: data.section,
              hasVoted: data.has_voted,
              status: data.status,
              photo: data.photo
            };
            // Guardar en local para futuras sesiones
            db.users.push(newUser);
            saveDB(db);
            onLogin(newUser);
          } else {
            setError('Documento no encontrado o no autorizado.');
          }
        } catch (err) {
          setError('Error de conexión con la nube.');
        } finally {
          setIsLoading(false);
        }
      };
      performCloudLogin();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 relative z-10 border border-slate-200">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg mb-4 text-white">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">EduVote Pro</h1>
          <p className="text-slate-500 text-center mt-2">Sistema Nacional de Elecciones Escolares</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Número de Documento / Carné
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserCircle size={20} />
              </div>
              <input
                type="text"
                required
                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-slate-900 bg-slate-50"
                placeholder="Ej. 10101010"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">Prueba con "12345" (Admin) o "1010" (Estudiante)</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-start gap-2 text-sm border border-red-100 animate-shake">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <KeyRound size={20} />
                Ingresar al Sistema
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-center text-xs text-slate-400">
            &copy; 2024 Gobierno Escolar Digital. Todos los derechos reservados.
            <br />
            Cumple con Ley 115 de Educación.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
