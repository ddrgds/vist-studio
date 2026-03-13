import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: 'linear-gradient(135deg, var(--joi-pink), var(--joi-magenta))', color: '#fff', boxShadow: '0 4px 16px rgba(255,107,157,0.15)' },
  secondary: { background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)', color: 'var(--joi-text-2)', backdropFilter: 'blur(8px)' },
  ghost: { background: 'transparent', color: 'var(--joi-text-3)' },
  danger: { background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171' },
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  disabled,
  children,
  className,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      style={variantStyles[variant]}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 cursor-pointer select-none hover:scale-[1.02] active:scale-[0.98] ${sizeClasses[size]} ${isDisabled ? 'opacity-40 pointer-events-none' : ''} ${loading ? 'opacity-70 pointer-events-none' : ''} ${className ?? ''}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  );
};

export default Button;
