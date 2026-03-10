import React from 'react';

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = {
  sm: 'px-2.5 py-1 text-[11px]',
  md: 'px-3 py-1.5 text-xs',
};

const Chip: React.FC<ChipProps> = ({ label, selected, onClick, icon, size = 'md', className }) => (
  <button
    onClick={onClick}
    style={selected
      ? { background: 'var(--accent-dim)', borderColor: 'rgba(240,104,72,0.4)', color: 'var(--accent)' }
      : { background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--text-3)' }
    }
    className={`inline-flex items-center gap-1.5 rounded-lg cursor-pointer transition-all duration-150 font-medium select-none border hover:scale-[1.02] ${sizeClasses[size]} ${className ?? ''}`}
  >
    {icon}
    {label}
  </button>
);

export default Chip;
