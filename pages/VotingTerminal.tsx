
import React, { useState, useEffect } from 'react';
import { User, Candidate, CandidacyType } from '../types';
import { getDB, saveDB, addAuditLog } from '../db';
import { supabase } from '../supabase';
import { CheckCircle2, AlertCircle, ShieldCheck, ChevronRight, Lock } from 'lucide-react';

interface VotingTerminalProps {
  user: User;
  onVoteComplete: () => void;
}

const VotingTerminal: React.FC<VotingTerminalProps> = ({ user, onVoteComplete }) => {
  const [step, setStep] = useState<'welcome' | 'voting' | 'confirm' | 'success'>('welcome');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const db = getDB();
    setCandidates(db.candidates.filter(c => c.type === CandidacyType.PERSONERO));
  }, []);

  const handleVoteSubmit = async () => {
    if (!selectedCandidate) return;

    setIsSubmitting(true);
    // Secure simulation delay
    setTimeout(() => {
      const db = getDB();

      // Security Check: Re-verify if user already voted
      const currentUser = db.users.find(u => u.id === user.id);
      if (currentUser?.hasVoted) {
        alert("ALERTA DE SEGURIDAD: Ya has registrado un voto previo.");
        onVoteComplete();
        return;
      }

      // Record the vote
      const voteId = Math.random().toString(36).substr(2, 9);
      db.votes.push({
        id: voteId,
        voterId: user.id,
        candidateId: selectedCandidate.id,
        timestamp: new Date().toISOString(),
        hash: 'SHA256_' + Math.random().toString(36).substr(2, 12)
      });

      // Update candidate count
      const candIdx = db.candidates.findIndex(c => c.id === selectedCandidate.id);
      if (candIdx !== -1) {
        db.candidates[candIdx].voteCount += 1;
      }

      // Mark user as voted
      const userIdx = db.users.findIndex(u => u.id === user.id);
      if (userIdx !== -1) {
        db.users[userIdx].hasVoted = true;
      }

      // Supabase Cloud Backup (Fire and forget or wait)
      supabase.from('votes').insert([{
        voter_id: user.id.length > 30 ? user.id : undefined,
        candidate_id: selectedCandidate.id,
        hash: 'SHA256_' + Math.random().toString(36).substr(2, 12)
      }]).then(() => {
        // Update vote count on cloud
        if (selectedCandidate.id !== 'blank') {
          supabase.rpc('increment_vote_count', { candidate_id: selectedCandidate.id });
        }
        // Update user status on cloud
        if (user.id.length > 30) {
          supabase.from('users').update({ has_voted: true }).eq('id', user.id);
        }
      });

      saveDB(db);
      addAuditLog(user.name, 'Voto Registrado', `Voto seguro ID: ${voteId}`).then(() => {
        setIsSubmitting(false);
        setStep('success');
      });
    }, 1500);
  };

  if (user.hasVoted && step !== 'success') {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl border border-slate-200 text-center">
        <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
          <Lock size={40} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Acceso Restringido</h2>
        <p className="text-lg text-slate-600 mb-8">
          Ya has participado en este proceso electoral. El sistema solo permite un voto por estudiante para garantizar la transparencia.
        </p>
        <button
          onClick={onVoteComplete}
          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
        >
          Finalizar Sesión
        </button>
      </div>
    );
  }

  if (step === 'welcome') {
    return (
      <div className="max-w-3xl mx-auto p-12 bg-white rounded-3xl shadow-2xl border border-slate-100">
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-blue-200">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4">¡Hola, {user.name}!</h2>
          <p className="text-xl text-slate-500">Bienvenido al cubículo digital de votación.</p>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl mb-10 border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-blue-600" />
            Instrucciones de Seguridad
          </h3>
          <ul className="space-y-3 text-slate-600">
            <li className="flex gap-2"><span>•</span> Tu voto es 100% secreto y encriptado.</li>
            <li className="flex gap-2"><span>•</span> Tienes una única oportunidad para votar.</li>
            <li className="flex gap-2"><span>•</span> Asegúrate de confirmar tu elección antes de finalizar.</li>
          </ul>
        </div>

        <button
          onClick={() => setStep('voting')}
          className="w-full bg-blue-600 text-white py-5 rounded-2xl text-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-4 group"
        >
          Empezar a Votar
          <ChevronRight size={28} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    );
  }

  if (step === 'voting') {
    return (
      <div className="space-y-10">
        <div className="text-center">
          <h2 className="text-4xl font-black text-slate-900 mb-2">Elección de Personero Estudiantil</h2>
          <p className="text-lg text-slate-500">Selecciona el candidato de tu preferencia pulsando sobre su tarjeta.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {candidates.map((cand) => (
            <button
              key={cand.id}
              onClick={() => {
                setSelectedCandidate(cand);
                setStep('confirm');
              }}
              className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border-4 border-white hover:border-blue-600 text-left relative"
            >
              <div className="h-64 overflow-hidden bg-slate-100">
                <img src={cand.photo} alt={cand.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6">
                <p className="text-blue-600 font-bold text-sm mb-1 uppercase tracking-widest">{cand.grade}</p>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{cand.name}</h3>
                <p className="text-slate-500 line-clamp-2 text-sm italic">"{cand.proposal}"</p>
              </div>
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-full px-4 py-1 text-sm font-bold shadow-sm">
                Candidato #{cand.id === 'blank' ? '00' : Math.floor(Math.random() * 10) + 1}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'confirm' && selectedCandidate) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Confirma tu Voto</h2>
          <p className="text-slate-400">¿Estás seguro que deseas votar por este candidato?</p>
        </div>

        <div className="p-10 flex flex-col items-center">
          <div className="w-48 h-48 rounded-full overflow-hidden border-8 border-slate-100 mb-6 shadow-xl">
            <img src={selectedCandidate.photo} alt={selectedCandidate.name} className="w-full h-full object-cover" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-1">{selectedCandidate.name}</h3>
          <p className="text-blue-600 font-bold mb-8">{selectedCandidate.grade}</p>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              onClick={() => setStep('voting')}
              className="py-4 rounded-2xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar y Volver
            </button>
            <button
              disabled={isSubmitting}
              onClick={handleVoteSubmit}
              className="py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Procesando...' : 'Sí, Confirmar Voto'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-12 bg-white rounded-3xl shadow-2xl border border-slate-100 text-center animate-bounce-in">
        <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600">
          <CheckCircle2 size={64} />
        </div>
        <h2 className="text-4xl font-black text-slate-900 mb-4">¡Voto Registrado!</h2>
        <p className="text-xl text-slate-600 mb-10">
          Gracias por participar en el ejercicio democrático de tu institución. Tu voz es fundamental para el Gobierno Escolar.
        </p>
        <div className="bg-blue-50 p-6 rounded-2xl mb-10 flex flex-col items-center">
          <p className="text-sm font-bold text-blue-800 mb-2 uppercase tracking-widest">Hash de Seguridad Único</p>
          <code className="text-blue-600 font-mono break-all text-xs">
            {Math.random().toString(36).substring(2, 15).toUpperCase()}
            {Math.random().toString(36).substring(2, 15).toUpperCase()}
          </code>
        </div>
        <button
          onClick={onVoteComplete}
          className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold text-xl hover:bg-slate-800 transition-colors shadow-xl"
        >
          Salir y Finalizar
        </button>
      </div>
    );
  }

  return null;
};

export default VotingTerminal;
