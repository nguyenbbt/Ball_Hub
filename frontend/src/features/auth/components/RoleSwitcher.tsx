import React from 'react';
import type { UserRole } from '../types';

interface RoleSwitcherProps {
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ selectedRole, onRoleChange }) => {
  return (
    <div className="flex bg-surface-container-highest p-1.5 rounded-xl border border-outline-variant/20">
      <button
        type="button"
        onClick={() => onRoleChange('PLAYER')}
        className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 ${
          selectedRole === 'PLAYER'
            ? 'bg-primary-container text-white shadow-lg shadow-primary-container/20'
            : 'text-outline hover:text-on-surface-variant hover:bg-surface-bright'
        }`}
      >
        Player
      </button>
      <button
        type="button"
        onClick={() => onRoleChange('COACH')}
        className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 ${
          selectedRole === 'COACH'
            ? 'bg-primary-container text-white shadow-lg shadow-primary-container/20'
            : 'text-outline hover:text-on-surface-variant hover:bg-surface-bright'
        }`}
      >
        Coach
      </button>
    </div>
  );
};