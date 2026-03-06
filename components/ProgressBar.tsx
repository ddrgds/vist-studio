import React from 'react';

interface ProgressBarProps {
  progress: number;
  label?: string;
  onCancel?: () => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label, onCancel }) => {
  return (
    <div className="w-full space-y-2 animate-in fade-in duration-300" aria-live="polite">
      <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
        <div className="flex items-center gap-3">
          <span>{label || 'Procesando...'}</span>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95 transition-all outline-none"
              type="button"
              title="Detener generación"
            >
              Detener
            </button>
          )}
        </div>
        <span>{Math.round(progress)}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progreso de generación'}
        className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden"
      >
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(5, progress)}%`, background: 'linear-gradient(90deg, #FF5C35, #FFB347)', boxShadow: '0 0 10px rgba(255,92,53,0.45)' }}
        >
          <div className="w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;