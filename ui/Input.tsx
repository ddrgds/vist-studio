import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input: React.FC<InputProps> = ({ label, className, ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--joi-text-3)' }}>
        {label}
      </label>
    )}
    <input
      {...props}
      style={{ background: 'var(--joi-bg-2)', borderColor: 'rgba(255,255,255,.04)', color: 'var(--joi-text-1)', backdropFilter: 'blur(8px)' }}
      className={`w-full border rounded-xl px-3 py-2.5 text-sm placeholder:text-zinc-600 transition-colors duration-150 focus:outline-none focus:border-[rgba(255,107,157,0.3)] focus:ring-1 focus:ring-[rgba(255,107,157,0.1)] ${className ?? ''}`}
    />
  </div>
);

export default Input;

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className, ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--joi-text-3)' }}>
        {label}
      </label>
    )}
    <textarea
      {...props}
      style={{ background: 'var(--joi-bg-2)', borderColor: 'rgba(255,255,255,.04)', color: 'var(--joi-text-1)', backdropFilter: 'blur(8px)' }}
      className={`w-full border rounded-xl px-3 py-2.5 text-sm placeholder:text-zinc-600 transition-colors duration-150 focus:outline-none focus:border-[rgba(255,107,157,0.3)] focus:ring-1 focus:ring-[rgba(255,107,157,0.1)] min-h-[80px] resize-none ${className ?? ''}`}
    />
  </div>
);
