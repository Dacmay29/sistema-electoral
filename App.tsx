
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Vote,
  BarChart3,
  Settings,
  ShieldCheck,
  LogOut,
  UserPlus,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  FileText,
  Search
} from 'lucide-react';
import { Role, ElectionStatus, CandidacyType, User } from './types';
import { getDB, saveDB, addAuditLog } from './db';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import VotingTerminal from './pages/VotingTerminal';
import CandidateManagement from './pages/CandidateManagement';
import ElectionConfig from './pages/ElectionConfig';
import AuditLogViewer from './pages/AuditLogViewer';
import UserManagement from './pages/UserManagement';
import CandidateEnrollment from './pages/CandidateEnrollment';
import CandidateShowcase from './pages/CandidateShowcase';
import { Database, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    await addAuditLog(user.name, 'Inicio de Sesión', `Acceso con rol: ${user.role}`);

    // Auto redirect based on role
    if (user.role === Role.STUDENT) {
      setActiveTab('vote');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      await addAuditLog(currentUser.name, 'Cierre de Sesión', 'El usuario salió del sistema');
    }
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  useEffect(() => {
    const item = navItems.find(i => i.id === activeTab);
    if (item) {
      document.title = `${item.label} | EduVote Pro`;
    }
  }, [activeTab]);

  const renderContent = () => {
    if (!currentUser) return <Login onLogin={handleLogin} />;

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard role={currentUser.role} />;
      case 'vote':
        return <VotingTerminal user={currentUser} onVoteComplete={handleLogout} />;
      case 'candidates':
        return <CandidateEnrollment />;
      case 'users':
        return <UserManagement />;
      case 'config':
        return <ElectionConfig />;
      case 'logs':
        return <AuditLogViewer />;
      case 'showcase':
        return <CandidateShowcase />;
      default:
        return <Dashboard role={currentUser.role} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.ADMIN, Role.RECTOR, Role.AUDITOR, Role.ELECTORAL_COMMITTEE] },
    { id: 'vote', label: 'Votación', icon: Vote, roles: [Role.STUDENT, Role.ADMIN, Role.JURY] },
    { id: 'candidates', label: 'Inscripciones', icon: UserPlus, roles: [Role.ADMIN, Role.ELECTORAL_COMMITTEE] },
    { id: 'users', label: 'Padrón Electoral', icon: Users, roles: [Role.ADMIN, Role.ELECTORAL_COMMITTEE] },
    { id: 'config', label: 'Configuración', icon: Settings, roles: [Role.ADMIN] },
    { id: 'logs', label: 'Auditoría', icon: ShieldCheck, roles: [Role.ADMIN, Role.RECTOR] },
    { id: 'showcase', label: 'Candidatos', icon: Sparkles, roles: [Role.STUDENT, Role.ADMIN, Role.RECTOR, Role.AUDITOR, Role.ELECTORAL_COMMITTEE, Role.JURY] },
  ];

  if (!currentUser) return renderContent();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-20'
          } bg-slate-900 text-white transition-all duration-300 flex flex-col z-50 fixed md:relative h-full ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'
          }`}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ShieldCheck size={24} />
          </div>
          {isSidebarOpen && <span className="font-bold text-lg truncate">EduVote Pro</span>}
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1">
          {navItems.filter(item => item.roles.includes(currentUser.role)).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${activeTab === item.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-40 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-semibold text-slate-800 capitalize">
              {navItems.find(i => i.id === activeTab)?.label || 'Sistema'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{currentUser.name}</p>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{currentUser.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 font-bold">
              {currentUser.name[0]}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
