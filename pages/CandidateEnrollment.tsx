
import React, { useState, useEffect } from 'react';
import { Candidate, CandidacyType, Role } from '../types';
import { getDB, saveDB, addAuditLog, fileToBase64 } from '../db';
import {
    UserPlus,
    Search,
    Trash2,
    UserCheck,
    IdCard,
    Users,
    ClipboardCheck,
    Award,
    BookOpen,
    Camera,
    X,
    Edit2
} from 'lucide-react';

const CandidateEnrollment: React.FC = () => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<CandidacyType | 'ALL'>('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
    const [newCandidate, setNewCandidate] = useState<Partial<Candidate>>({
        type: CandidacyType.PERSONERO,
        voteCount: 0
    });

    useEffect(() => {
        setCandidates(getDB().candidates);
    }, []);

    const handleSave = async () => {
        if (!newCandidate.name || !newCandidate.grade) {
            alert('Por favor completa los campos obligatorios (Nombre y Grado)');
            return;
        }

        const db = getDB();
        if (editingCandidate) {
            const index = db.candidates.findIndex(c => c.id === editingCandidate.id);
            if (index !== -1) {
                db.candidates[index] = { ...editingCandidate, ...newCandidate } as Candidate;
                await addAuditLog('Admin', 'Candidato Editado', `Editado: ${newCandidate.name}`);
            }
        } else {
            const candidateToSave = {
                ...newCandidate,
                id: Math.random().toString(36).substr(2, 9),
                photo: newCandidate.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newCandidate.name}&backgroundColor=b6e3f4`,
                voteCount: 0
            } as Candidate;
            db.candidates.push(candidateToSave);
            await addAuditLog('Admin', 'Inscripción de Candidato', `Nueva inscripción: ${candidateToSave.name} para ${candidateToSave.type}`);
        }

        saveDB(db);
        setCandidates([...db.candidates]);
        setIsModalOpen(false);
        setEditingCandidate(null);
        setNewCandidate({ type: CandidacyType.PERSONERO, voteCount: 0 });
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                setNewCandidate({ ...newCandidate, photo: base64 });
            } catch (err) {
                console.error('Error al procesar la imagen:', err);
                alert('Error al cargar la imagen. Intenta con un archivo más pequeño.');
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas anular esta inscripción?')) return;
        const db = getDB();
        db.candidates = db.candidates.filter(c => c.id !== id);
        saveDB(db);
        setCandidates(db.candidates);
        await addAuditLog('Admin', 'Inscripción Anulada', `ID: ${id}`);
    };

    const filteredCandidates = candidates.filter(c => {
        if (c.id === 'blank') return false;
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.grade.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = activeFilter === 'ALL' || c.type === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const stats = {
        personeraria: candidates.filter(c => c.type === CandidacyType.PERSONERO).length,
        curso: candidates.filter(c => c.type === CandidacyType.COURSE_REPRESENTATIVE).length,
        total: candidates.filter(c => c.id !== 'blank').length
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-2xl">
                            <UserPlus size={28} />
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Módulo de Inscripciones</h2>
                    </div>
                    <p className="text-slate-500 font-medium max-w-md">
                        Registra y gestiona las candidaturas para Personería, Representantes de curso y Consejo Estudiantil.
                    </p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={() => {
                            setEditingCandidate(null);
                            setNewCandidate({ type: CandidacyType.PERSONERO, voteCount: 0 });
                            setIsModalOpen(true);
                        }}
                        className="flex-1 md:flex-none bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 hover:-translate-y-1 active:translate-y-0"
                    >
                        <UserPlus size={20} />
                        Inscribir Candidato
                    </button>
                </div>
            </div>

            {/* Stats Quick View */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="bg-amber-100 text-amber-600 p-4 rounded-2xl">
                        <Award size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-bold">Personería</p>
                        <p className="text-2xl font-black text-slate-900">{stats.personeraria} <span className="text-sm font-normal text-slate-400">candidatos</span></p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="bg-blue-100 text-blue-600 p-4 rounded-2xl">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-bold">Rep. de Curso</p>
                        <p className="text-2xl font-black text-slate-900">{stats.curso} <span className="text-sm font-normal text-slate-400">inscritos</span></p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="bg-slate-100 text-slate-600 p-4 rounded-2xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-bold">Total Sistema</p>
                        <p className="text-2xl font-black text-slate-900">{stats.total} <span className="text-sm font-normal text-slate-400">aspirantes</span></p>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o curso..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl overflow-x-auto w-full md:w-auto">
                    {(['ALL', ...Object.values(CandidacyType)] as const).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeFilter === filter
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {filter === 'ALL' ? 'Todos' : filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Candidates List */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCandidates.map((cand) => (
                    <div key={cand.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                        <div className="relative h-64 bg-slate-100">
                            <img src={cand.photo} alt={cand.name} className="w-full h-full object-cover" />
                            <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                <button
                                    onClick={() => {
                                        setEditingCandidate(cand);
                                        setNewCandidate({ ...cand });
                                        setIsModalOpen(true);
                                    }}
                                    className="bg-white p-3 rounded-2xl text-slate-600 hover:text-indigo-600 shadow-xl"
                                    title="Editar Inscripción"
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button
                                    onClick={() => handleDelete(cand.id)}
                                    className="bg-white p-3 rounded-2xl text-slate-600 hover:text-red-600 shadow-xl"
                                    title="Anular Inscripción"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                            <div className="absolute bottom-4 left-4 flex gap-2">
                                <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                                    ID: {cand.id}
                                </span>
                                {cand.ballotNumber && (
                                    <span className="bg-white text-slate-900 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                                        Tarjetón: {cand.ballotNumber}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors uppercase">{cand.name}</h3>
                                    <div className="flex items-center gap-2 mt-1 text-indigo-500 font-bold">
                                        <IdCard size={14} />
                                        <span className="text-sm">Grado {cand.grade}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                                <p className="text-slate-600 text-sm italic font-medium">"{cand.proposal || 'Sin propuesta registrada'}"</p>
                            </div>

                            <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-tighter px-4 py-2.5 rounded-xl ${cand.type === CandidacyType.PERSONERO ? 'text-amber-600 bg-amber-50' :
                                cand.type === CandidacyType.COURSE_REPRESENTATIVE ? 'text-blue-600 bg-blue-50' :
                                    'text-indigo-600 bg-indigo-50'
                                }`}>
                                <UserCheck size={14} />
                                Candidato a {cand.type}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredCandidates.length === 0 && (
                    <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <Users size={48} className="mb-4 opacity-20" />
                        <p className="text-xl font-bold">No se encontraron aspirantes</p>
                        <p className="text-sm">Intenta con otro filtro o registra uno nuevo</p>
                    </div>
                )}
            </div>

            {/* Enrollment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                        <div className="bg-indigo-600 px-10 py-10 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                                <UserPlus size={160} />
                            </div>

                            <h3 className="text-3xl font-black mb-2 relative z-10">{editingCandidate ? 'Editar Aspirante' : 'Formulario de Inscripción'}</h3>
                            <p className="text-indigo-100 font-medium opacity-80 relative z-10">
                                {editingCandidate ? `Actualizando datos de ${editingCandidate.name}` : 'Completa la información oficial del aspirante.'}
                            </p>
                        </div>

                        <div className="p-10 space-y-6 overflow-y-auto max-h-[70vh]">
                            {/* Photo Section */}
                            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 gap-4 mb-4">
                                {newCandidate.photo ? (
                                    <div className="relative group">
                                        <img
                                            src={newCandidate.photo}
                                            className="w-32 h-32 rounded-3xl object-cover shadow-xl border-4 border-white"
                                            alt="Vista previa"
                                        />
                                        <button
                                            onClick={() => setNewCandidate({ ...newCandidate, photo: undefined })}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-white p-6 rounded-3xl shadow-sm">
                                        <Camera size={40} className="text-slate-300" />
                                    </div>
                                )}
                                <div className="text-center">
                                    <label className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm cursor-pointer hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 mb-2 inline-block">
                                        {newCandidate.photo ? 'Cambiar Foto' : 'Subir Foto del Aspirante'}
                                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-slate-700 uppercase tracking-wider ml-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 font-bold"
                                        value={newCandidate.name || ''}
                                        onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-slate-700 uppercase tracking-wider ml-1">Grado / Curso</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 font-bold"
                                        value={newCandidate.grade || ''}
                                        onChange={(e) => setNewCandidate({ ...newCandidate, grade: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-slate-700 uppercase tracking-wider ml-1">Número en Tarjetón</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. 01"
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 font-bold"
                                        value={newCandidate.ballotNumber || ''}
                                        onChange={(e) => setNewCandidate({ ...newCandidate, ballotNumber: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-black text-slate-700 uppercase tracking-wider ml-1">Tipo de Candidatura</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.values(CandidacyType).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setNewCandidate({ ...newCandidate, type })}
                                            className={`p-4 rounded-2xl border-2 font-bold text-left transition-all ${newCandidate.type === type
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100'
                                                : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-black text-slate-700 uppercase tracking-wider ml-1">Resumen de Propuesta</label>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl h-32 outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 font-medium resize-none"
                                    value={newCandidate.proposal || ''}
                                    onChange={(e) => setNewCandidate({ ...newCandidate, proposal: e.target.value })}
                                ></textarea>
                            </div>
                        </div>

                        <div className="px-10 py-8 bg-slate-50 flex justify-end gap-4">
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingCandidate(null);
                                }}
                                className="px-8 py-3.5 rounded-2xl font-black text-slate-500 hover:bg-slate-200 transition-colors uppercase tracking-widest text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-10 py-3.5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 uppercase tracking-widest text-xs"
                            >
                                {editingCandidate ? 'Guardar Cambios' : 'Confirmar Inscripción'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidateEnrollment;
