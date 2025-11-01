
export interface PoblacionData {
  nombre: string;
  telefono: string;
  email: string;
  moderador: string;
  telModerador: string;
  arcipreste: string;
  telArcipreste: string;
  animador: string;
  telAnimador: string;
}

export interface Transcript {
  id: number;
  speaker: 'user' | 'model';
  text: string;
  isFinal: boolean;
}

export enum LiveStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR',
}
