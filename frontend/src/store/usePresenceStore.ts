import { create } from 'zustand';

interface Player {
  id: string;
  name: string;
  status: 'online' | 'away' | 'offline';
}

interface PresenceState {
  onlinePlayers: Player[];
  setOnlinePlayers: (players: Player[]) => void;
}

const mockPlayers: Player[] = [
  { id: '1', name: 'Lionel Messi', status: 'online' },
  { id: '2', name: 'Cristiano Ronaldo', status: 'online' },
  { id: '3', name: 'Neymar Jr', status: 'away' },
  { id: '4', name: 'Kylian Mbappé', status: 'online' },
];

export const usePresenceStore = create<PresenceState>((set) => ({
  onlinePlayers: mockPlayers,
  setOnlinePlayers: (players) => set({ onlinePlayers: players }),
}));
