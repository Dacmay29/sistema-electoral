
import React, { useState } from 'react';
import { getDB, saveDB, addAuditLog, exportDBToExcel, importDBFromExcel, clearAllData } from '../db';
import { ElectionStatus, CandidacyType } from '../types';
import { Settings, Save, Power, Database, Trash2, AlertCircle, FileSpreadsheet, Download, RefreshCw, FileText, School, UserCircle, Briefcase } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ElectionConfig: React.FC = () => {
  const [db, setDb] = useState(getDB());
  const election = db.elections[0];

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

  const updateElectionField = (field: keyof typeof election, value: string) => {
    const newDb = { ...db };
    const idx = newDb.elections.findIndex(e => e.id === election.id);
    if (idx !== -1) {
      (newDb.elections[idx] as any)[field] = value;
      saveDB(newDb);
      setDb(newDb);
    }
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const dateStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    // Header
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

    // Process each candidacy type
    election.types.forEach((type) => {
      const candidatesInType = db.candidates.filter(c => c.type === type && c.id !== 'blank');
      const blankVote = db.candidates.find(c => c.type === type && c.id === 'blank');

      // Sort to find winner
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

    // Signatures
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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl">
              <Settings size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Panel de Control Maestro</h2>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${election.status === ElectionStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
            SISTEMA: {election.status}
          </span>
        </div>

        <div className="p-8 space-y-8">
          {/* Main Toggle */}
          <div className="flex gap-6 p-8 bg-indigo-50/50 rounded-[2.5rem] border-2 border-dashed border-indigo-100 items-center">
            <div className={`p-5 rounded-3xl shadow-2xl transition-all ${election.status === ElectionStatus.ACTIVE ? 'bg-emerald-500 text-white rotate-12' : 'bg-red-500 text-white'}`}>
              <Power size={32} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-indigo-900 mb-2">Control de Urnas Digitales</h3>
              <p className="text-sm text-indigo-700/70 mb-6 font-medium">Active este interruptor solo cuando los jurados de votación estén listos en sus puestos.</p>
              <button
                onClick={handleToggleElection}
                className={`px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 ${election.status === ElectionStatus.ACTIVE
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                  }`}
              >
                {election.status === ElectionStatus.ACTIVE ? 'Detener Proceso Electoral' : 'Iniciar Proceso Electoral'}
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 space-y-6">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
              <Database size={20} className="text-slate-400" />
              Garantía de Datos (Base de Datos Excel)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Excel Export */}
              <button
                onClick={() => exportDBToExcel()}
                className="flex items-center gap-4 p-5 bg-blue-50/50 border border-blue-100 rounded-[2rem] hover:bg-blue-50 transition-all group"
              >
                <div className="bg-white p-3.5 rounded-2xl shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <p className="font-black text-blue-900 text-sm uppercase">Exportar Todo a Excel</p>
                  <p className="text-xs text-blue-700 font-medium">Guarda usuarios, candidatos y resultados en .xlsx</p>
                </div>
              </button>

              {/* Excel Import */}
              <label className="flex items-center gap-4 p-5 bg-emerald-50/50 border border-emerald-100 rounded-[2rem] hover:bg-emerald-50 transition-all group cursor-pointer">
                <div className="bg-white p-3.5 rounded-2xl shadow-sm text-emerald-600 group-hover:scale-110 transition-transform">
                  <Download size={24} />
                </div>
                <div>
                  <p className="font-black text-emerald-900 text-sm uppercase tracking-tight">Cargar Base de Datos Excel</p>
                  <p className="text-xs text-emerald-700 font-medium">Sincroniza el sistema con tu archivo Excel.</p>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const success = await importDBFromExcel(file);
                        if (success) {
                          alert('¡Base de Datos Sincronizada con Excel!');
                          window.location.reload();
                        } else {
                          alert('Error: Formato de Excel no válido para el sistema.');
                        }
                      }
                    }}
                  />
                </div>
              </label>

              {/* Reset Votes */}
              <button
                onClick={handleResetSystem}
                className="flex items-center gap-4 p-5 bg-amber-50/50 border border-amber-100 rounded-[2rem] hover:bg-amber-50 transition-all group"
              >
                <div className="bg-white p-3.5 rounded-2xl shadow-sm text-amber-600 group-hover:scale-110 transition-transform">
                  <RefreshCw size={24} />
                </div>
                <div>
                  <p className="font-black text-amber-900 text-sm uppercase">Reiniciar Solo Votos</p>
                  <p className="text-xs text-amber-700 font-medium">Limpia las urnas pero mantiene nombres.</p>
                </div>
              </button>

              {/* Wipe All */}
              <button
                onClick={handleWipeAll}
                className="flex items-center gap-4 p-5 bg-red-50/50 border border-red-100 rounded-[2rem] hover:bg-red-50 transition-all group"
              >
                <div className="bg-white p-3.5 rounded-2xl shadow-sm text-red-600 group-hover:scale-110 transition-transform">
                  <Trash2 size={24} />
                </div>
                <div>
                  <p className="font-black text-red-900 text-sm uppercase">Borrar Todo (Formatear)</p>
                  <p className="text-xs text-red-700 font-medium">Limpia el sistema al 100%.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Official Configuration Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl">
            <School size={20} />
          </div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Configuración Institucional</h2>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <School size={14} /> Nombre de la Institución
              </label>
              <input
                type="text"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold"
                placeholder="Ej. Institución Educativa Distrital..."
                value={election.institutionName || ''}
                onChange={(e) => updateElectionField('institutionName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <UserCircle size={14} /> Nombre del Rector(a)
              </label>
              <input
                type="text"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold"
                placeholder="Nombre completo del Rector"
                value={election.rectorName || ''}
                onChange={(e) => updateElectionField('rectorName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Briefcase size={14} /> Encargado de Feria Democrática
              </label>
              <input
                type="text"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold"
                placeholder="Nombre del Coordinador/Docente"
                value={election.coordinatorName || ''}
                onChange={(e) => updateElectionField('coordinatorName', e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={generatePDFReport}
                className="w-full flex items-center justify-center gap-3 p-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 hover:-translate-y-1 active:translate-y-0"
              >
                <FileText size={20} />
                Generar Acta de Ganadores (PDF)
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <AlertCircle size={100} className="text-white" />
        </div>
        <div className="relative z-10">
          <h4 className="font-black text-white text-lg uppercase tracking-widest mb-2 flex items-center gap-2">
            Nota de Seguridad
          </h4>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl">
            Este sistema no utiliza archivos JSON "ficticios". Para su comodidad, hemos configurado el **Excel como su Motor de Base de Datos Principal**.
            Cualquier cambio que realice aquí o en el Padrón Electoral solo será permanente si exporta su base de datos a Excel al finalizar su jornada.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ElectionConfig;
