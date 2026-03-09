
import React, { useState, useEffect } from 'react';
import { Candidate, CandidacyType } from '../types';
import { getDB, saveDB, addAuditLog } from '../db';
import { Plus, Trash2, Edit3, Camera, FileText, CheckCircle2 } from 'lucide-react';

const CandidateManagement: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCandidate, setNewCandidate] = useState<Partial<Candidate>>({
    type: CandidacyType.PERSONERO,
    voteCount: 0
  });

  useEffect(() => {
    setCandidates(getDB().candidates);
  }, []);

  const handleSave = async () => {
    if (!newCandidate.name || !newCandidate.grade) return;

    const db = getDB();
    const candidateToSave = {
      ...newCandidate,
      id: Math.random().toString(36).substr(2, 9),
      photo: newCandidate.photo || `https://picsum.photos/seed/${newCandidate.name}/300/300`
    } as Candidate;

    db.candidates.push(candidateToSave);
    saveDB(db);
    setCandidates(db.candidates);
    setIsModalOpen(false);
    await addAuditLog('Admin', 'Candidato Creado', `Nuevo candidato: ${candidateToSave.name}`);
    setNewCandidate({ type: CandidacyType.PERSONERO, voteCount: 0 });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este candidato?')) return;
    const db = getDB();
    db.candidates = db.candidates.filter(c => c.id !== id);
    saveDB(db);
    setCandidates(db.candidates);
    await addAuditLog('Admin', 'Candidato Eliminado', `ID: ${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestión de Candidatos</h2>
          <p className="text-slate-500">Administra los perfiles que aparecerán en el tarjetón.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          <Plus size={20} />
          Nuevo Candidato
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.filter(c => c.id !== 'blank').map((cand) => (
          <div key={cand.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group">
            <div className="relative h-48 bg-slate-100">
              <img src={cand.photo} alt={cand.name} className="w-full h-full object-cover" />
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="bg-white p-2 rounded-lg text-slate-600 hover:text-blue-600 shadow-lg">
                  <Edit3 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(cand.id)}
                  className="bg-white p-2 rounded-lg text-slate-600 hover:text-red-600 shadow-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-slate-900">{cand.name}</h3>
                <div className="text-right">
                  <span className="bg-blue-50 text-blue-600 text-xs font-black px-2 py-1 rounded uppercase tracking-wider block mb-1">{cand.grade}</span>
                  <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider block">N° {cand.ballotNumber || '00'}</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2 italic">"{cand.proposal}"</p>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                <CheckCircle2 size={14} />
                PERFIL VERIFICADO POR COMITÉ
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">Registrar Nuevo Candidato</h3>
            </div>
            <div className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Nombre Completo</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej. Juan Pérez"
                    value={newCandidate.name || ''}
                    onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Grado</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej. 11-A"
                    value={newCandidate.grade || ''}
                    onChange={(e) => setNewCandidate({ ...newCandidate, grade: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Número Tarjetón</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej. 01"
                    value={newCandidate.ballotNumber || ''}
                    onChange={(e) => setNewCandidate({ ...newCandidate, ballotNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Cargo a Postular</label>
                <select
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={newCandidate.type}
                  onChange={(e) => setNewCandidate({ ...newCandidate, type: e.target.value as CandidacyType })}
                >
                  <option value={CandidacyType.PERSONERO}>Personero Estudiantil</option>
                  <option value={CandidacyType.CONTRALOR}>Contralor</option>
                  <option value={CandidacyType.REPRESENTATIVE}>Representante al Consejo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Propuesta Principal</label>
                <textarea
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-32 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe los puntos clave de la campaña..."
                  value={newCandidate.proposal || ''}
                  onChange={(e) => setNewCandidate({ ...newCandidate, proposal: e.target.value })}
                ></textarea>
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                Guardar Candidato
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateManagement;
