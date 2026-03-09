import { Role, CandidacyType, ElectionStatus, User, Candidate, Election, AuditLog, Vote } from './types';
import * as XLSX from 'xlsx';

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
    { id: '1', name: 'Admin Principal', document: '12345', role: Role.ADMIN, hasVoted: false, status: 'Activo' },
    { id: '2', name: 'Rectoría Institucional', document: '11111', role: Role.RECTOR, hasVoted: false, status: 'Activo' },
    { id: '3', name: 'Jurado Mesa 01', document: '22222', role: Role.JURY, hasVoted: false, status: 'Activo' },
    { id: '101', name: 'Estudiante Prueba', document: '1010', role: Role.STUDENT, grade: '11', section: 'A', hasVoted: false, status: 'Activo' },
  ],
  candidates: [
    {
      id: 'c1',
      name: 'Camila Rodriguez',
      grade: '11-B',
      proposal: 'Renovación de espacios deportivos y torneos interclases mensuales.',
      photo: 'https://picsum.photos/seed/camila/300/300',
      type: CandidacyType.PERSONERO,
      voteCount: 0,
      ballotNumber: '02'
    },
    {
      id: 'c2',
      name: 'Santiago López',
      grade: '11-A',
      proposal: 'Digitalización de la biblioteca y club de robótica extraescolar.',
      photo: 'https://picsum.photos/seed/santiago/300/300',
      type: CandidacyType.PERSONERO,
      voteCount: 0,
      ballotNumber: '01'
    },
    {
      id: 'blank',
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
      id: 'e1',
      title: 'Elección Gobierno Escolar 2024',
      startDate: '2024-03-15',
      endDate: '2024-03-15',
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
