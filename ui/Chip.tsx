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
      ? { background: 'rgba(255,107,157,0.08)', borderColor: 'rgba(255,107,157,0.2)', color: 'var(--joi-pink)' }
      : { background: 'var(--joi-bg-2)', borderColor: 'rgba(255,255,255,.04)', color: 'var(--joi-text-3)' }
    }
    className={`inline-flex items-center gap-1.5 rounded-lg cursor-pointer transition-all duration-150 font-medium select-none border hover:scale-[1.02] ${sizeClasses[size]} ${className ?? ''}`}
  >
    {icon}
    {label}
  </button>
);

export default Chip;
