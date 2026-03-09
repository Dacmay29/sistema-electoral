
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { getDB, saveDB, addAuditLog, clearAllData, exportDBToExcel, syncToSupabase } from '../db';
import { UserPlus, Upload, Search, Trash2, CheckCircle2, XCircle, Download, Edit2, Save, X, FileSpreadsheet, RefreshCw, Cloud } from 'lucide-react';
import * as XLSX from 'xlsx';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    role: Role.STUDENT,
    status: 'Activo'
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUsers(getDB().users);
  }, []);

  const handleSaveUser = async () => {
    if (!formData.name || !formData.document) {
      alert('Nombre y Documento son obligatorios.');
      return;
    }

    const db = getDB();
    if (editingUser) {
      const index = db.users.findIndex(u => u.id === editingUser.id);
      if (index !== -1) {
        db.users[index] = { ...editingUser, ...formData } as User;
        await addAuditLog('Admin', 'Usuario Editado', `Editado: ${formData.name}`);
      }
    } else {
      if (db.users.some(u => u.document === formData.document)) {
        alert('Este documento ya existe.');
        return;
      }
      const newUser: User = {
        id: crypto.randomUUID(),
        hasVoted: false,
        status: 'Activo',
        ...formData
      } as User;
      db.users.push(newUser);
      await addAuditLog('Admin', 'Usuario Creado', `Creado: ${newUser.name} manual`);
    }

    saveDB(db);
    setUsers([...db.users]);
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ role: Role.STUDENT, status: 'Activo' });

    // Auto-sync to cloud
    setIsSyncing(true);
    await syncToSupabase();
    setIsSyncing(false);
  };

  const deleteUser = async (id: string) => {
    if (!confirm('¿Seguro que deseas ELIMINAR permanentemente este usuario?')) return;
    const db = getDB();
    const user = db.users.find(u => u.id === id);
    db.users = db.users.filter(u => u.id !== id);
    saveDB(db);
    setUsers([...db.users]);
    await addAuditLog('Admin', 'Usuario Eliminado', `Eliminado: ${user?.name} (ID: ${id})`);

    // Auto-sync
    setIsSyncing(true);
    await syncToSupabase();
    setIsSyncing(false);
  };

  const handleClearAll = async () => {
    if (!confirm('¿ESTÁS SEGURO? Esto eliminará TODO el padrón electoral actual. No se puede deshacer.')) return;
    clearAllData();
    setUsers([]);
    await addAuditLog('Admin', 'Base de Datos Reiniciada', 'Se eliminaron todos los registros de usuarios');
    alert('Base de Datos de Usuarios Limpiada con Éxito');
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user });
    setIsModalOpen(true);
  };

  const toggleStatus = async (id: string) => {
    const db = getDB();
    const userIdx = db.users.findIndex(u => u.id === id);
    if (userIdx !== -1) {
      db.users[userIdx].status = db.users[userIdx].status === 'Activo' ? 'Inactivo' : 'Activo';
      saveDB(db);
      setUsers([...db.users]);
      await addAuditLog('Admin', 'Cambio de Estado Usuario', `Usuario ID ${id} ahora ${db.users[userIdx].status}`);
    }
  };

  const validateDocument = (doc: string) => {
    const regex = /^\d{5,12}$/;
    return regex.test(doc);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Nombre Completo': 'Ejemplo Estudiante',
        'Documento': '123456789',
        'Grado': '10',
        'Seccion': 'A',
        'Rol': 'Estudiante'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Votantes');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `plantilla_padron_electoral_${date}.xlsx`);
    addAuditLog('Admin', 'Descarga Plantilla', 'Descargó plantilla de Excel para carga masiva');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      const db = getDB();
      const currentUsers = [...db.users];
      let importedCount = 0;

      jsonData.forEach((row: any) => {
        const name = row['Nombre Completo'];
        const document = String(row['Documento']);
        const grade = row['Grado'];
        const section = row['Seccion'];
        const role = row['Rol'] || Role.STUDENT;

        if (name && document && validateDocument(document) && !currentUsers.some(u => u.document === document)) {
          const newUser: User = {
            id: crypto.randomUUID(),
            name,
            document,
            grade: grade ? String(grade) : undefined,
            section: section ? String(section) : undefined,
            role: role as Role,
            hasVoted: false,
            status: 'Activo'
          };
          currentUsers.push(newUser);
          importedCount++;
        }
      });

      if (importedCount > 0) {
        db.users = currentUsers;
        saveDB(db);
        setUsers(currentUsers);
        await addAuditLog('Admin', 'Carga Masiva', `Se importaron ${importedCount} votantes existosamente`);
        alert(`${importedCount} usuarios importados con éxito.`);
      } else {
        alert('No se encontraron nuevos usuarios válidos para importar.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.document.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-slate-800">Padrón Electoral</h2>
          <div className="flex items-center gap-2">
            <p className="text-slate-500">Gestión de la base de datos de votantes.</p>
            {isSyncing && (
              <span className="flex items-center gap-1 text-[10px] font-black text-blue-600 animate-pulse uppercase tracking-tighter">
                <RefreshCw size={10} className="animate-spin" /> Sincronizando...
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-colors border border-slate-200"
          >
            <Download size={18} />
            Plantilla
          </button>
          <button
            onClick={() => exportDBToExcel()}
            className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl font-bold hover:bg-blue-100 transition-colors border border-blue-100"
          >
            <FileSpreadsheet size={18} />
            Exportar a Excel
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all hover:scale-105"
          >
            <Upload size={18} />
            Importar Excel
          </button>
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData({ role: Role.STUDENT, status: 'Activo' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-slate-900 shadow-lg shadow-slate-200"
          >
            <UserPlus size={18} />
            Nuevo
          </button>
          <button
            onClick={async () => {
              setIsSyncing(true);
              const success = await syncToSupabase();
              setIsSyncing(false);
              if (success) alert('¡Padrón Electoral sincronizado con la Nube!');
            }}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-100 border border-emerald-100 transition-colors"
          >
            <Cloud size={18} className={isSyncing ? 'animate-bounce' : ''} />
            {isSyncing ? 'Sincronizando...' : 'Nube'}
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 bg-red-100 text-red-600 px-4 py-2.5 rounded-xl font-bold hover:bg-red-200 border border-red-200 transition-colors"
          >
            <Trash2 size={18} />
            Limpiar Todo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o documento..."
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Grado / Rol</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-slate-50 ${user.status === 'Inactivo' ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4 font-bold text-slate-800">{user.name}</td>
                  <td className="px-6 py-4 font-mono text-slate-500">{user.document}</td>
                  <td className="px-6 py-4 uppercase text-xs font-black text-slate-600">
                    {user.grade ? `${user.grade}° ${user.section || ''}` : user.role}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.status === 'Activo' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(user)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                      <button onClick={() => deleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                      <button
                        onClick={() => toggleStatus(user.id)}
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded ${user.status === 'Activo' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                          }`}
                      >
                        {user.status === 'Activo' ? 'Bloquear' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet size={48} className="opacity-10" />
                      <p className="font-bold">No hay usuarios registrados</p>
                      <p className="text-sm">Importa un archivo Excel para comenzar</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx, .xls" className="hidden" />

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input
                  placeholder="Nombre y Apellidos"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Documento de Identidad</label>
                <input
                  placeholder="Sin puntos ni comas"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-50 font-mono text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.document || ''}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol en el sistema</label>
                  <select
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  >
                    {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {formData.role === Role.STUDENT && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grado</label>
                    <input placeholder="Ej: 11" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={formData.grade || ''} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} />
                  </div>
                )}
              </div>
              {formData.role === Role.STUDENT && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sección / Grupo</label>
                  <input placeholder="Ej: A" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={formData.section || ''} onChange={(e) => setFormData({ ...formData, section: e.target.value })} />
                </div>
              )}
            </div>
            <div className="px-8 py-6 bg-slate-50 border-t flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-6 font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
              <button onClick={handleSaveUser} className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"><Save size={18} />Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
