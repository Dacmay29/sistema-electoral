
import React, { useMemo } from 'react';
import { getDB } from '../db';
import { Role, CandidacyType } from '../types';
import { 
  Users, 
  Vote, 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle2,
  PieChart as PieChartIcon,
  AlertTriangle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface DashboardProps {
  role: Role;
}

const Dashboard: React.FC<DashboardProps> = ({ role }) => {
  const db = getDB();
  const activeElection = db.elections[0];
  
  const stats = useMemo(() => {
    const totalUsers = db.users.filter(u => u.role === Role.STUDENT).length;
    const votedUsers = db.users.filter(u => u.hasVoted).length;
    const participationRate = totalUsers > 0 ? (votedUsers / totalUsers) * 100 : 0;
    
    return {
      totalUsers,
      votedUsers,
      participationRate: participationRate.toFixed(1),
      pendingUsers: totalUsers - votedUsers,
      totalCandidates: db.candidates.length
    };
  }, [db]);

  const chartData = useMemo(() => {
    return db.candidates
      .filter(c => c.type === CandidacyType.PERSONERO)
      .map(c => ({
        name: c.name,
        votos: c.voteCount
      }));
  }, [db]);

  const COLORS = ['#3b82f6', '#818cf8', '#6366f1', '#4f46e5', '#3730a3'];

  return (
    <div className="space-y-6">
      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
              <Users size={24} />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12% vs Ayer</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Estudiantes Habilitados</h3>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalUsers}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
              <Vote size={24} />
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">En Vivo</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Votos Registrados</h3>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.votedUsers}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Meta 95%</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Participación</h3>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.participationRate}%</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600">
              <AlertTriangle size={24} />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Votos Pendientes</h3>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.pendingUsers}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-slate-800">Resultados Parciales: Personería</h3>
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              <Clock size={14} />
              Actualizado: Hace 2 min
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="votos" radius={[8, 8, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status/Activity List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Estado de la Jornada</h3>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-green-100 text-green-600 p-2 rounded-lg mt-1">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Candidatos Verificados</p>
                <p className="text-sm text-slate-500">Todos los perfiles fueron validados por el Comité Electoral.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-green-100 text-green-600 p-2 rounded-lg mt-1">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Mesas Activas</p>
                <p className="text-sm text-slate-500">12 mesas de votación operando con normalidad.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-lg mt-1">
                <Calendar size={18} />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Fecha Límite</p>
                <p className="text-sm text-slate-500">El proceso cierra hoy a las 4:00 PM.</p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6">
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-sm font-bold text-blue-800 mb-2">Resumen Participación</p>
                <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${stats.participationRate}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2 text-xs font-medium text-blue-600">
                  <span>{stats.votedUsers} Votos</span>
                  <span>{stats.totalUsers} Total</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
