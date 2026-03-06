import React, { useState } from 'react';
import { CustomPreset } from '../types';
import { useToast } from '../contexts/ToastContext';

interface CustomPresetsProps {
  presets: CustomPreset[];
  onApply: (preset: CustomPreset) => void;
  onDelete: (id: string) => void;
}

const CustomPresets: React.FC<CustomPresetsProps> = ({ presets, onApply, onDelete }) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const toast = useToast();

  const handleApply = (preset: CustomPreset) => {
    onApply(preset);
    toast.info(`Preset "${preset.name}" aplicado`);
  };

  const handleDeleteConfirm = (preset: CustomPreset) => {
    onDelete(preset.id);
    setConfirmDeleteId(null);
    toast.success(`Preset "${preset.name}" eliminado`);
  };

  if (presets.length === 0) {
    return (
      <div className="space-y-4 pt-6 border-t border-zinc-800">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">Mis Presets</h2>
        <p className="text-xs text-zinc-600 text-center py-2">
          Guarda tu primer preset con el botón de arriba.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-6 border-t border-zinc-800">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">Mis Presets</h2>
      <div className="space-y-2">
        {presets.map(preset => (
          <div
            key={preset.id}
            className="flex items-center gap-2 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all group"
          >
            {confirmDeleteId === preset.id ? (
              /* ── Inline delete confirmation ── */
              <div
                role="alertdialog"
                aria-label={`Confirmar eliminación de ${preset.name}`}
                className="flex items-center gap-2 w-full animate-in fade-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
              >
                <span className="text-[10px] text-zinc-300 flex-1 truncate">¿Eliminar "{preset.name}"?</span>
                <button
                  onClick={() => handleDeleteConfirm(preset)}
                  aria-label="Confirmar eliminación"
                  className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg transition-colors shrink-0"
                >
                  Sí
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  aria-label="Cancelar eliminación"
                  className="px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-white text-[10px] font-bold rounded-lg transition-colors shrink-0"
                >
                  No
                </button>
              </div>
            ) : (
              /* ── Normal state ── */
              <>
                <button
                  onClick={() => handleApply(preset)}
                  aria-label={`Aplicar preset ${preset.name}`}
                  className="flex-1 flex items-center gap-2.5 text-left min-w-0"
                >
                  {/* Thumbnail — foto de referencia del preset */}
                  {preset.thumbnail ? (
                    <img
                      src={preset.thumbnail}
                      alt={`Thumbnail de ${preset.name}`}
                      className="w-8 h-8 rounded-md object-cover shrink-0 border border-zinc-700"
                    />
                  ) : (
                    <span aria-hidden="true" className="text-sm shrink-0">⚙️</span>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-400 group-hover:text-white truncate">{preset.name}</p>
                    {/* Pequeño resumen de qué tiene el preset */}
                    {(preset.data as any)?.characteristics && (
                      <p className="text-[9px] text-zinc-600 truncate">{(preset.data as any).characteristics}</p>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setConfirmDeleteId(preset.id)}
                  aria-label={`Eliminar preset ${preset.name}`}
                  className="p-1 text-zinc-600 hover:text-red-400 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomPresets;
