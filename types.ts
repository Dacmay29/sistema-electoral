
export enum Role {
  ADMIN = 'Administrador',
  RECTOR = 'Rector',
  ELECTORAL_COMMITTEE = 'Comité Electoral',
  JURY = 'Jurado',
  STUDENT = 'Estudiante',
  AUDITOR = 'Auditor'
}

export enum CandidacyType {
  PERSONERO = 'Personero',
  CONTRALOR = 'Contralor',
  REPRESENTATIVE = 'Representante al Consejo',
  COURSE_REPRESENTATIVE = 'Representante de Curso'
}

export enum ElectionStatus {
  DRAFT = 'Borrador',
  ACTIVE = 'Activo',
  CLOSED = 'Cerrado'
}

export interface User {
  id: string;
  name: string;
  document: string;
  role: Role;
  grade?: string;
  section?: string;
  hasVoted: boolean;
  status: 'Activo' | 'Inactivo';
  photo?: string;
}

export interface Candidate {
  id: string;
  name: string;
  grade: string;
  proposal: string;
  photo: string;
  type: CandidacyType;
  voteCount: number;
  ballotNumber?: string;
}

export interface Election {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: ElectionStatus;
  types: CandidacyType[];
  institutionName?: string;
  rectorName?: string;
  coordinatorName?: string;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  details: string;
  hash: string;
  previousHash: string;
}

export interface Vote {
  id: string;
  voterId: string;
  candidateId: string;
  timestamp: string;
  hash: string;
}
