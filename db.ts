import { Role, CandidacyType, ElectionStatus, User, Candidate, Election, AuditLog, Vote } from './types';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';

// Simple hash function for "Local Blockchain"
const sha256 = async (message: string) => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const STORAGE_KEY = 'school_election_db';

interface DBState {
  users: User[];
  candidates: Candidate[];
  elections: Election[];
  votes: Vote[];
  auditLogs: AuditLog[];
}

const INITIAL_STATE: DBState = {
  users: [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Admin Principal', document: '12345', role: Role.ADMIN, hasVoted: false, status: 'Activo' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Rectoría Institucional', document: '11111', role: Role.RECTOR, hasVoted: false, status: 'Activo' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Jurado Mesa 01', document: '22222', role: Role.JURY, hasVoted: false, status: 'Activo' },
    { id: '44444444-4444-4444-4444-444444444444', name: 'Estudiante Prueba', document: '1010', role: Role.STUDENT, grade: '11', section: 'A', hasVoted: false, status: 'Activo' },
  ],
  candidates: [
    {
      id: 'c1c1c1c1-1111-1111-1111-111111111111',
      name: 'Camila Rodriguez',
      grade: '11-B',
      proposal: 'Renovación de espacios deportivos y torneos interclases mensuales.',
      photo: 'https://picsum.photos/seed/camila/300/300',
      type: CandidacyType.PERSONERO,
      voteCount: 0,
      ballotNumber: '02'
    },
    {
      id: 'c2c2c2c2-2222-2222-2222-222222222222',
      name: 'Santiago López',
      grade: '11-A',
      proposal: 'Digitalización de la biblioteca y club de robótica extraescolar.',
      photo: 'https://picsum.photos/seed/santiago/300/300',
      type: CandidacyType.PERSONERO,
      voteCount: 0,
      ballotNumber: '01'
    },
    {
      id: 'blank-blank-blank-blank-blank-blank',
      name: 'Voto en Blanco',
      grade: '-',
      proposal: 'Ninguno de los candidatos anteriores.',
      photo: 'https://picsum.photos/seed/blank/300/300',
      type: CandidacyType.PERSONERO,
      voteCount: 0
    }
  ],
  elections: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Elección Gobierno Escolar',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      status: ElectionStatus.ACTIVE,
      types: [CandidacyType.PERSONERO]
    }
  ],
  votes: [],
  auditLogs: [
    {
      id: 'l1',
      user: 'Sistema',
      action: 'Sistema Iniciado',
      timestamp: new Date().toISOString(),
      details: 'Génesis del sistema electoral',
      previousHash: '0',
      hash: 'genesis_block_hash'
    }
  ]
};

export const getDB = (): DBState => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : INITIAL_STATE;
};

export const saveDB = (state: DBState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const addAuditLog = async (user: string, action: string, details: string) => {
  const db = getDB();
  const timestamp = new Date().toISOString();
  const previousLog = db.auditLogs[0];
  const previousHash = previousLog ? previousLog.hash : '0';

  const logContent = `${user}${action}${details}${timestamp}${previousHash}`;
  const hash = await sha256(logContent);

  db.auditLogs.unshift({
    id: Math.random().toString(36).substr(2, 9),
    user,
    action,
    details,
    timestamp,
    hash,
    previousHash
  });
  saveDB(db);
};

export const exportDBToExcel = () => {
  try {
    const db = getDB();
    const wb = XLSX.utils.book_new();

    // Students/Users
    const wsUsers = XLSX.utils.json_to_sheet(db.users);
    XLSX.utils.book_append_sheet(wb, wsUsers, 'Padron_Electoral');

    // Candidates
    const wsCandidates = XLSX.utils.json_to_sheet(db.candidates);
    XLSX.utils.book_append_sheet(wb, wsCandidates, 'Candidatos');

    // Votes (Anonymized)
    const wsVotes = XLSX.utils.json_to_sheet(db.votes);
    XLSX.utils.book_append_sheet(wb, wsVotes, 'Votos');

    // Logs
    const wsLogs = XLSX.utils.json_to_sheet(db.auditLogs);
    XLSX.utils.book_append_sheet(wb, wsLogs, 'Bitacora_Seguridad');

    const fileName = `DB_SISTEMA_ELECTORAL_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
};

export const importDBFromExcel = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const db: DBState = {
          ...getDB(),
          users: XLSX.utils.sheet_to_json(workbook.Sheets['Padron_Electoral'] || []),
          candidates: XLSX.utils.sheet_to_json(workbook.Sheets['Candidatos'] || []),
          votes: XLSX.utils.sheet_to_json(workbook.Sheets['Votos'] || []),
          auditLogs: XLSX.utils.sheet_to_json(workbook.Sheets['Bitacora_Seguridad'] || [])
        };

        if (db.users.length >= 0) {
          saveDB(db);
          resolve(true);
        } else {
          resolve(false);
        }
      } catch (error) {
        console.error('Error importing from Excel:', error);
        resolve(false);
      }
    };
    reader.readAsBinaryString(file);
  });
};

export const clearAllData = () => {
  const emptyState: DBState = {
    ...INITIAL_STATE,
    users: [],
    candidates: [],
    votes: [],
    auditLogs: []
  };
  saveDB(emptyState);
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const resetDB = () => {
  saveDB(INITIAL_STATE);
};

// Supabase Sync Functions
export const syncToSupabase = async () => {
  const db = getDB();
  try {
    console.log('Iniciando sincronización con Supabase...');

    // Sync Users
    if (db.users.length > 0) {
      const { error: userError } = await supabase.from('users').upsert(
        db.users.map(u => ({
          id: u.id,
          name: u.name,
          document: u.document,
          role: u.role,
          grade: u.grade,
          section: u.section,
          has_voted: u.hasVoted,
          status: u.status,
          photo: u.photo
        })),
        { onConflict: 'id' }
      );
      if (userError) throw userError;
    }

    // Sync Candidates
    if (db.candidates.length > 0) {
      const { error: candError } = await supabase.from('candidates').upsert(
        db.candidates.map(c => ({
          id: c.id,
          name: c.name,
          grade: c.grade,
          proposal: c.proposal,
          photo: c.photo,
          type: c.type,
          vote_count: c.voteCount,
          ballot_number: c.ballotNumber
        })),
        { onConflict: 'id' }
      );
      if (candError) throw candError;
    }

    // Sync Elections
    if (db.elections.length > 0) {
      const { error: electError } = await supabase.from('elections').upsert(
        db.elections.map(e => ({
          id: e.id,
          title: e.title,
          status: e.status,
          types: e.types,
          institution_name: e.institutionName,
          rector_name: e.rectorName,
          coordinator_name: e.coordinatorName
        })),
        { onConflict: 'id' }
      );
      if (electError) throw electError;
    }

    console.log('Sincronización completada con éxito.');
    return true;
  } catch (error) {
    console.error('CRITICAL: Error en syncToSupabase:', error);
    return false;
  }
};

export const pullFromSupabase = async (): Promise<boolean> => {
  try {
    const { data: users } = await supabase.from('users').select('*');
    const { data: candidates } = await supabase.from('candidates').select('*');
    const { data: elections } = await supabase.from('elections').select('*');
    const { data: votes } = await supabase.from('votes').select('*');
    const { data: logs } = await supabase.from('audit_logs').select('*');

    if (!users || !candidates) return false;

    const newState: DBState = {
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        document: u.document,
        role: u.role as Role,
        grade: u.grade,
        section: u.section,
        hasVoted: u.has_voted,
        status: u.status as 'Activo' | 'Inactivo',
        photo: u.photo
      })),
      candidates: candidates.map(c => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        proposal: c.proposal,
        photo: c.photo,
        type: c.type as CandidacyType,
        voteCount: c.vote_count,
        ballotNumber: c.ballot_number
      })),
      elections: elections?.map(e => ({
        id: e.id,
        title: e.title,
        startDate: e.start_date,
        endDate: e.end_date,
        status: e.status as ElectionStatus,
        types: e.types as CandidacyType[],
        institutionName: e.institution_name,
        rectorName: e.rector_name,
        coordinatorName: e.coordinator_name
      })) || INITIAL_STATE.elections,
      votes: votes?.map(v => ({
        id: v.id,
        voterId: v.voter_id,
        candidateId: v.candidate_id,
        timestamp: v.timestamp,
        hash: v.hash
      })) || [],
      auditLogs: logs?.map(l => ({
        id: l.id,
        user: l.user_name,
        action: l.action,
        timestamp: l.timestamp,
        details: l.details,
        hash: l.hash,
        previousHash: l.previous_hash
      })) || INITIAL_STATE.auditLogs
    };

    saveDB(newState);
    return true;
  } catch (error) {
    console.error('Error pulling from Supabase:', error);
    return false;
  }
};
