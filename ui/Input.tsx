import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input: React.FC<InputProps> = ({ label, className, ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
        {label}
      </label>
    )}
    <input
      {...props}
      style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text-1)' }}
      className={`w-full border rounded-lg px-3 py-2.5 text-sm placeholder:text-zinc-600 transition-colors duration-150 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20 ${className ?? ''}`}
    />
  </div>
);

export default Input;

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className, ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
        {label}
      </label>
    )}
    <textarea
      {...props}
      style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text-1)' }}
      className={`w-full border rounded-lg px-3 py-2.5 text-sm placeholder:text-zinc-600 transition-colors duration-150 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20 min-h-[80px] resize-none ${className ?? ''}`}
    />
  </div>
);
