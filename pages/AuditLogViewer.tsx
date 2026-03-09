
import React, { useState, useEffect } from 'react';
import { getDB, addAuditLog } from '../db';
import { AuditLog } from '../types';
import { ShieldCheck, Search, Download, FileText, Filter, Link as LinkIcon } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';

// Extend jsPDF to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}

const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLogs(getDB().auditLogs);
  }, []);

  const filteredLogs = logs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportAuditPDF = async () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('ACTA DE AUDITORÍA ELECTORAL', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 30);
    doc.text('Sistema de Elección de Personero Estudiantil - Registro Inmutable (Blockchain)', 14, 35);

    // Data for table
    const tableData = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.user,
      log.action,
      log.details,
      log.hash.substring(0, 12) + '...'
    ]);

    doc.autoTable({
      startY: 45,
      head: [['Fecha', 'Usuario', 'Acción', 'Detalles', 'Hash Firma']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      columnStyles: { 4: { fontStyle: 'bold' } }
    });

    // Verification Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text('Firmas de Responsabilidad:', 14, finalY);

    doc.line(14, finalY + 15, 64, finalY + 15);
    doc.text('Rectoría', 14, finalY + 20);

    doc.line(114, finalY + 15, 164, finalY + 15);
    doc.text('Comité Electoral', 114, finalY + 20);

    doc.save(`acta_auditoria_${new Date().toISOString().split('T')[0]}.pdf`);
    await addAuditLog('Admin', 'Exportación PDF', 'Se generó y descargó el Acta de Auditoría en PDF');
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Libro de Auditoría</h2>
          <p className="text-slate-500">Registro inmutable de todas las acciones del sistema.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por acción o usuario..."
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={exportAuditPDF}
            className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
          >
            <Download size={18} />
            Exportar Acta
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha y Hora</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acción</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hash de Verificación</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Integridad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {log.user[0]}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${log.action.includes('Eliminado') ? 'bg-red-50 text-red-600' :
                      log.action.includes('Creado') ? 'bg-emerald-50 text-emerald-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                      {log.action}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">{log.details}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono bg-slate-50 px-2 py-1 rounded text-slate-500 border border-slate-100">
                        <span className="font-bold text-slate-400">CURR:</span> {log.hash.substring(0, 16)}...
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono bg-slate-50 px-2 py-1 rounded text-slate-400">
                        <LinkIcon size={8} /> <span className="font-bold">PREV:</span> {log.previousHash.substring(0, 16)}...
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-emerald-500 font-bold text-[10px] uppercase tracking-widest bg-emerald-50/50 px-2 py-1 rounded-lg border border-emerald-100">
                      <ShieldCheck size={14} />
                      Blockchain OK
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No se encontraron registros que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogViewer;
