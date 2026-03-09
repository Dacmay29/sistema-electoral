
import React, { useState, useEffect, useRef } from 'react';
import { getDB } from '../db';
import { Candidate } from '../types';
import { Sparkles, RefreshCw, Trophy, Target, BookOpen, ChevronLeft, ChevronRight, Play, Pause, Award } from 'lucide-react';

const CandidateShowcase: React.FC = () => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAutoPlay, setIsAutoPlay] = useState(true);
    const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

    const shuffleArray = (array: Candidate[]) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    const loadCandidates = () => {
        setIsRefreshing(true);
        const db = getDB();
        const realCandidates = db.candidates.filter(c => c.id !== 'blank');

        setTimeout(() => {
            setCandidates(shuffleArray(realCandidates));
            setCurrentIndex(0);
            setIsRefreshing(false);
        }, 600);
    };

    useEffect(() => {
        loadCandidates();
    }, []);

    useEffect(() => {
        if (isAutoPlay && candidates.length > 0) {
            autoPlayRef.current = setInterval(() => {
                handleNext();
            }, 5000);
        } else {
            if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        }
        return () => {
            if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        };
    }, [isAutoPlay, currentIndex, candidates.length]);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % candidates.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + candidates.length) % candidates.length);
    };

    if (candidates.length === 0 && !isRefreshing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
                <Sparkles size={64} className="mb-4 opacity-20" />
                <h3 className="text-2xl font-bold">No hay candidatos para mostrar</h3>
                <button onClick={loadCandidates} className="mt-4 text-blue-600 font-bold hover:underline">Reintentar</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent pb-10 overflow-hidden">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Pasarela de Candidatos
                        <Sparkles className="text-amber-500 animate-pulse" />
                    </h2>
                    <p className="text-slate-500 mt-1 text-lg">
                        Explora los perfiles en detalle. Los candidatos se desplazan automáticamente.
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAutoPlay(!isAutoPlay)}
                        className={`p-4 rounded-2xl font-bold transition-all shadow-lg flex items-center gap-2 ${isAutoPlay ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                            }`}
                    >
                        {isAutoPlay ? <Pause size={20} /> : <Play size={20} />}
                        {isAutoPlay ? 'Pausar' : 'Auto-reproducir'}
                    </button>
                    <button
                        onClick={loadCandidates}
                        disabled={isRefreshing}
                        className="group p-4 bg-slate-900 text-white rounded-2xl font-bold transition-all hover:bg-blue-600 disabled:opacity-70 shadow-xl"
                    >
                        <RefreshCw className={`${isRefreshing ? 'animate-spin' : ''}`} size={20} />
                    </button>
                </div>
            </div>

            {/* Interactive Stage */}
            <div className="relative h-[720px] flex items-center justify-center mt-5 perspective-[2000px]">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[120px] -z-10" />

                <div className="relative w-full max-w-5xl h-full flex items-center justify-center">
                    {candidates.map((candidate, index) => {
                        let position = index - currentIndex;
                        if (position < -1) position += candidates.length;
                        if (position > candidates.length / 2) position -= candidates.length;

                        const isActive = index === currentIndex;
                        const isPrev = position === -1;
                        const isNext = position === 1;
                        const isVisible = isActive || isPrev || isNext;

                        if (!isVisible) return null;

                        return (
                            <div
                                key={candidate.id}
                                className={`absolute transition-all duration-1000 ease-out flex flex-col items-center
                                ${isActive ? 'z-30 scale-100 opacity-100' : 'z-10 scale-[0.65] opacity-30 blur-sm pointer-events-none'}
                                ${isPrev ? '-translate-x-[400px] rotate-y-[35deg]' : ''}
                                ${isNext ? 'translate-x-[400px] -rotate-y-[35deg]' : ''}
                                ${isActive ? 'translate-x-0 rotate-y-0' : ''}
                                `}
                            >
                                {/* Fixed Layout Card: Photo TOP, Info BOTTOM */}
                                <div className={`relative w-[420px] h-[600px] rounded-[3.5rem] overflow-hidden bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-100 transition-all duration-500`}>

                                    {/* Photo Container (Top 60%) */}
                                    <div className="relative h-[65%] w-full overflow-hidden bg-slate-200">
                                        <img
                                            src={candidate.photo || `https://picsum.photos/seed/${candidate.id}/600/800`}
                                            className="w-full h-full object-cover object-top transition-transform duration-700 hover:scale-105"
                                            alt={candidate.name}
                                        />

                                        {/* Distinct top bar badge */}
                                        <div className="absolute top-8 left-8 flex flex-col gap-2 z-20">
                                            <div className="px-5 py-2 bg-blue-600/90 backdrop-blur-md text-white text-[11px] font-black rounded-full uppercase tracking-widest shadow-xl">
                                                {candidate.type}
                                            </div>
                                            <div className="px-5 py-2 bg-white/30 backdrop-blur-md text-white text-[11px] font-black rounded-full border border-white/40 uppercase tracking-widest">
                                                GRADO {candidate.grade}
                                            </div>
                                        </div>

                                        {/* Subtle overlay only at the very bottom of the photo */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                                    </div>

                                    {/* Info Panel (Bottom 35-40%) - Never covers the face */}
                                    <div className="relative h-[35%] w-full bg-white p-8 px-10 flex flex-col justify-between">
                                        <div>
                                            {/* Candidate Name: Bold and Clear */}
                                            <h3 className="text-3xl font-black text-slate-900 leading-tight uppercase mb-3 tracking-tight">
                                                {candidate.name}
                                            </h3>

                                            {/* Proposal Preview */}
                                            <p className="text-slate-500 text-sm leading-snug line-clamp-2 font-medium italic border-l-4 border-blue-500 pl-4">
                                                "{candidate.proposal}"
                                            </p>
                                        </div>

                                        {/* Ballot Number Plate & Action */}
                                        <div className="flex justify-between items-end mt-4 border-t border-slate-100 pt-5">
                                            <div className="flex flex-col">
                                                <span className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Candidato Oficial</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl font-black text-slate-800">Vota por</span>
                                                    <div className="bg-slate-900 text-white px-4 py-1.5 rounded-2xl text-2xl font-black shadow-lg shadow-slate-200 transform -rotate-2 hover:rotate-0 transition-transform">
                                                        {candidate.ballotNumber || '00'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                                                    <Award size={22} />
                                                </div>
                                                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                                                    <BookOpen size={22} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Design Details */}
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-[4rem]" />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Navigation Controls */}
                <div className="absolute bottom-4 flex gap-8 items-center bg-white/90 p-5 px-8 rounded-[3rem] backdrop-blur-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white/50 z-50 transition-all hover:scale-105">
                    <button
                        onClick={handlePrev}
                        className="w-14 h-14 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md hover:bg-blue-600 hover:text-white"
                    >
                        <ChevronLeft size={28} />
                    </button>

                    <div className="flex gap-3">
                        {candidates.map((_, i) => (
                            <div
                                key={i}
                                className={`h-2.5 rounded-full transition-all duration-700 ${i === currentIndex ? 'w-12 bg-blue-600 shadow-[0_0_15px_-3px_rgba(37,99,235,0.6)]' : 'w-2.5 bg-slate-200'
                                    }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl hover:bg-blue-600"
                    >
                        <ChevronRight size={28} />
                    </button>
                </div>
            </div>

            {/* Decorative Background Elements */}
            <div className="fixed top-0 right-0 -z-20 w-[50rem] h-[50rem] bg-blue-50 rounded-full blur-[150px] opacity-25 translate-x-1/2 -translate-y-1/2" />
            <div className="fixed bottom-0 left-0 -z-20 w-[40rem] h-[40rem] bg-indigo-50 rounded-full blur-[120px] opacity-25 -translate-x-1/2 translate-y-1/2" />
        </div>
    );
};

export default CandidateShowcase;
