import React from 'react';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

const SectionLabel: React.FC<SectionLabelProps> = ({ children, className }) => (
  <span className={`text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500 select-none ${className ?? ''}`}>
    {children}
  </span>
);

export default SectionLabel;
