
import React, { useState } from 'react';
import { Settings, Save, Power, Database, Trash2, AlertCircle, FileSpreadsheet, Download, RefreshCw, FileText, School, UserCircle, Briefcase, CloudUpload, CloudDownload } from 'lucide-react';
import { getDB, saveDB, addAuditLog, exportDBToExcel, importDBFromExcel, clearAllData, syncToSupabase, pullFromSupabase } from '../db';
import { ElectionStatus, CandidacyType } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ElectionConfig: React.FC = () => {
  const [db, setDb] = useState(getDB());
  const [isSyncing, setIsSyncing] = useState(false);

  // Safe access to election
  const election = db.elections && db.elections.length > 0
    ? db.elections[0]
    : { id: 'default', title: 'Nueva Elección', status: ElectionStatus.DRAFT, types: [CandidacyType.PERSONERO], institutionName: '', rectorName: '', coordinatorName: '' };

  const handleToggleElection = async () => {
    const newStatus = election.status === ElectionStatus.ACTIVE ? ElectionStatus.CLOSED : ElectionStatus.ACTIVE;
    const newDb = { ...db };
    newDb.elections[0].status = newStatus;
    saveDB(newDb);
    setDb(newDb);
    await addAuditLog('Admin', 'Cambio de Estado Elección', `Nuevo estado: ${newStatus}`);
  };

  const handleResetSystem = async () => {
    if (!confirm('ATENCIÓN: Esto borrará todos los votos registrados pero mantendrá candidatos y usuarios. ¿Deseas continuar?')) return;
    const newDb = { ...db };
    newDb.votes = [];
    newDb.users = newDb.users.map(u => ({ ...u, hasVoted: false }));
    newDb.candidates = newDb.candidates.map(c => ({ ...c, voteCount: 0 }));
    saveDB(newDb);
    setDb(newDb);
    await addAuditLog('Admin', 'Reinicio de Sistema', 'Se han borrado todos los votos registrados.');
    alert('Sistema reiniciado con éxito.');
  };

  const handleWipeAll = async () => {
    if (!confirm('!!! PELIGRO !!! Esto eliminará ABSOLUTAMENTE TODO (Candidatos, Estudiantes, Votos y Configuración). Se usa para empezar de cero con un nuevo Excel. ¿Continuar?')) return;
    clearAllData();
    window.location.reload();
  };

  const handleCloudPush = async () => {
    setIsSyncing(true);
    const success = await syncToSupabase();
    setIsSyncing(false);
    if (success) {
      alert('¡Datos subidos a Supabase con éxito!');
    } else {
      alert('Error al sincronizar con la nube. Revisa tu conexión.');
    }
  };

  const handleCloudPull = async () => {
    if (!confirm('Esto reemplazará los datos locales con los de la nube. ¿Deseas continuar?')) return;
    setIsSyncing(true);
    const success = await pullFromSupabase();
    setIsSyncing(false);
    if (success) {
      alert('¡Datos descargados desde Supabase!');
      window.location.reload();
    } else {
      alert('Error al descargar datos de la nube.');
    }
  };

  const updateElectionField = (field: string, value: string) => {
    const newDb = { ...db };

    // Si no hay elecciones, creamos la primera
    if (!newDb.elections || newDb.elections.length === 0) {
      newDb.elections = [{
        id: 'e1',
        title: 'Elección Gobierno Escolar',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        status: ElectionStatus.ACTIVE,
        types: [CandidacyType.PERSONERO],
        institutionName: '',
        rectorName: '',
        coordinatorName: ''
      }];
    }

    const idx = 0; // Siempre editamos la principal para este sistema
    (newDb.elections[idx] as any)[field] = value;

    saveDB(newDb);
    setDb(newDb);
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const dateStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(election.institutionName || 'INSTITUCIÓN EDUCATIVA', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.text('ACTA OFICIAL DE ESCRUTINIOS Y DECLARACIÓN DE GANADORES', pageWidth / 2, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de Emisión: ${dateStr}`, pageWidth / 2, 38, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(20, 42, pageWidth - 20, 42);

    let currentY = 55;

    election.types.forEach((type) => {
      const candidatesInType = db.candidates.filter(c => c.type === type && c.id !== 'blank');
      const blankVote = db.candidates.find(c => c.type === type && c.id === 'blank');
      const sorted = [...candidatesInType].sort((a, b) => b.voteCount - a.voteCount);
      const winner = sorted[0];
      const isBlankWinner = blankVote && (blankVote.voteCount > (winner?.voteCount || 0));

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`RESULTADOS PARA: ${type.toUpperCase()}`, 20, currentY);
      currentY += 8;

      const tableData = candidatesInType.map(c => [c.name, c.grade, `${c.voteCount} votos`]);
      if (blankVote) {
        tableData.push(['VOTO EN BLANCO', '-', `${blankVote.voteCount} votos`]);
      }

      autoTable(doc, {
        startY: currentY,
        head: [['Candidato', 'Grado', 'Votación']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      if (isBlankWinner) {
        doc.text(`ESTADO: El Voto en Blanco obtuvo la mayoría. Se sugiere repetir el proceso.`, 20, currentY);
      } else if (winner) {
        doc.text(`GANADOR(A) DECLARADO: ${winner.name} (Grado ${winner.grade})`, 20, currentY);
      }
      currentY += 15;

      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
    });

    currentY = Math.max(currentY + 20, 220);
    doc.line(20, currentY, 80, currentY);
    doc.line(120, currentY, 180, currentY);
    doc.setFontSize(9);
    doc.text(election.rectorName || 'RECTOR(A)', 50, currentY + 5, { align: 'center' });
    doc.text(election.coordinatorName || 'REGISTRADOR / COORDINADOR', 150, currentY + 5, { align: 'center' });

    doc.save(`ACTA_ELECTORAL_${election.institutionName?.replace(/\s+/g, '_') || 'REPORTE'}.pdf`);
    addAuditLog('Admin', 'Reporte PDF Generado', `Generó acta oficial para ${election.institutionName}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl">
              <Settings size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Panel de Control Maestro</h2>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${election.status === ElectionStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            SISTEMA: {election.status}
          </span>
        </div>

        <div className="p-8 space-y-8">
          <div className="flex gap-6 p-8 bg-indigo-50/50 rounded-[2.5rem] border-2 border-dashed border-indigo-100 items-center">
            <div className={`p-5 rounded-3xl shadow-2xl transition-all ${election.status === ElectionStatus.ACTIVE ? 'bg-emerald-500 text-white rotate-12' : 'bg-red-500 text-white'}`}>
              <Power size={32} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-indigo-900 mb-2">Control de Urnas Digitales</h3>
              <p className="text-sm text-indigo-700/70 mb-6 font-medium">Active este interruptor solo cuando los jurados de votación estén listos.</p>
              <button
                onClick={handleToggleElection}
                className={`px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 ${election.status === ElectionStatus.ACTIVE ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'}`}
              >
                {election.status === ElectionStatus.ACTIVE ? 'Detener Proceso Electoral' : 'Iniciar Proceso Electoral'}
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 space-y-6">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
              <Database size={20} className="text-slate-400" />
              Gestión de Datos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => exportDBToExcel()} className="flex items-center gap-4 p-5 bg-blue-50/50 border border-blue-100 rounded-[2rem] hover:bg-blue-50 transition-all group">
                <div className="bg-white p-3.5 rounded-2xl shadow-sm text-blue-600 group-hover:scale-110 transition-transform"><FileSpreadsheet size={24} /></div>
                <div className="text-left"><p className="font-black text-blue-900 text-sm uppercase">Exportar a Excel</p><p className="text-xs text-blue-700 font-medium">Copia de seguridad local.</p></div>
              </button>
              <label className="flex items-center gap-4 p-5 bg-emerald-50/50 border border-emerald-100 rounded-[2rem] hover:bg-emerald-50 transition-all group cursor-pointer">
                <div className="bg-white p-3.5 rounded-2xl shadow-sm text-emerald-600 group-hover:scale-110 transition-transform"><Download size={24} /></div>
                <div className="text-left"><p className="font-black text-emerald-900 text-sm uppercase">Importar Excel</p><p className="text-xs text-emerald-700 font-medium">Cargar base de datos externa.</p></div>
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (await importDBFromExcel(file)) { alert('¡Base de Datos Importada!'); window.location.reload(); }
                    else { alert('Error en el archivo Excel.'); }
                  }
                }} />
              </label>
              <button onClick={handleResetSystem} className="flex items-center gap-4 p-5 bg-amber-50/50 border border-amber-100 rounded-[2rem] hover:bg-amber-50 transition-all group">
                <div className="bg-white p-3.5 rounded-2xl shadow-sm text-amber-600 group-hover:scale-110 transition-transform"><RefreshCw size={24} /></div>
                <div className="text-left"><p className="font-black text-amber-900 text-sm uppercase">Limpiar Votos</p><p className="text-xs text-amber-700 font-medium">Mantiene candidatos y usuarios.</p></div>
              </button>
              <button onClick={handleWipeAll} className="flex items-center gap-4 p-5 bg-red-50/50 border border-red-100 rounded-[2rem] hover:bg-red-50 transition-all group">
                <div className="bg-white p-3.5 rounded-2xl shadow-sm text-red-600 group-hover:scale-110 transition-transform"><Trash2 size={24} /></div>
                <div className="text-left"><p className="font-black text-red-900 text-sm uppercase">Formatear Sistema</p><p className="text-xs text-red-700 font-medium">Borra todo por completo.</p></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase Cloud Sync Section */}
      <div className="bg-slate-900 rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-800">
        <div className="bg-slate-800/50 px-8 py-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-white p-2 rounded-xl"><CloudUpload size={20} /></div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Sincronización en la Nube (Supabase)</h2>
          </div>
          {isSyncing && <RefreshCw size={20} className="text-emerald-400 animate-spin" />}
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={handleCloudPush} disabled={isSyncing} className="flex items-center gap-4 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl hover:bg-emerald-500/20 transition-all group">
            <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform"><CloudUpload size={28} /></div>
            <div className="text-left"><p className="font-black text-emerald-400 text-sm uppercase">Subir a la Nube</p><p className="text-xs text-emerald-100/60 font-medium">Respalda todo en Supabase.</p></div>
          </button>
          <button onClick={handleCloudPull} disabled={isSyncing} className="flex items-center gap-4 p-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl hover:bg-blue-500/20 transition-all group">
            <div className="bg-blue-500 text-white p-4 rounded-2xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform"><CloudDownload size={28} /></div>
            <div className="text-left"><p className="font-black text-blue-400 text-sm uppercase">Bajar de la Nube</p><p className="text-xs text-blue-100/60 font-medium">Restaura datos desde Supabase.</p></div>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl"><School size={20} /></div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Configuración Institucional</h2>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><School size={14} /> Institución</label>
              <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={election.institutionName || ''} onChange={(e) => updateElectionField('institutionName', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><UserCircle size={14} /> Rector(a)</label>
              <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={election.rectorName || ''} onChange={(e) => updateElectionField('rectorName', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Briefcase size={14} /> Coordinador</label>
              <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={election.coordinatorName || ''} onChange={(e) => updateElectionField('coordinatorName', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex items-end">
              <button
                onClick={async () => {
                  setIsSyncing(true);
                  const success = await syncToSupabase();
                  setIsSyncing(false);
                  if (success) alert('¡Información Institucional guardada en la Nube!');
                  else alert('Guardado localmente. Error al subir a la nube.');
                }}
                className="w-full flex items-center justify-center gap-3 p-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
              >
                <Save size={20} /> Guardar Cambios
              </button>
              <button onClick={generatePDFReport} className="w-full flex items-center justify-center gap-3 p-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs hover:bg-blue-600 transition-all shadow-xl">
                <FileText size={20} /> Generar Acta PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElectionConfig;
