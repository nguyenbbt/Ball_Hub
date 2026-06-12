export type Position = {
  x: number;
  y: number;
  name: string;
  initials: string;
  pos: string;
  color: string;
};

export type TacticNote = {
  label: string;
  active: boolean;
};

export type Tactic = {
  id: string;
  teamId?: string;
  name: string;
  players: Position[];
  notes: TacticNote[];
  createdAt?: string;
  updatedAt?: string;
};
