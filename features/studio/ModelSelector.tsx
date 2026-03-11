import React from 'react';
import { Lock, Zap } from 'lucide-react';
import { getAllModels } from '../../models/registry';
import { useStudioStore } from '../../stores/studioStore';
import type { Resolution } from '../../models/types';
import SectionLabel from '../../ui/SectionLabel';

const RESOLUTIONS: Resolution[] = ['1K', '2K', '4K'];

const ModelSelector: React.FC = () => {
  const { selectedModelId, setSelectedModelId, resolution, setResolution } = useStudioStore();
  const models = getAllModels();

  return (
    <div className="px-4 py-3 border-t border-zinc-800">
      <SectionLabel>AI Model</SectionLabel>
      <div className="flex flex-col gap-1.5 mt-2">
        {models.map((m) => {
          const isActive = selectedModelId === m.id;
          const isLocked = !!m.locked;
          const effectiveCost = m.getCost(resolution);
          return (
            <button
              key={m.id}
              onClick={() => {
                if (isLocked) return;
                setSelectedModelId(m.id);
              }}
              title={isLocked ? m.lockReason : `${m.name} — ${effectiveCost} at ${resolution}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-150 ${
                isLocked
                  ? 'opacity-50 cursor-not-allowed border-transparent'
                  : isActive
                    ? 'bg-coral/10 border-coral/30'
                    : 'border-transparent hover:bg-white/[0.03] hover:border-zinc-800'
              }`}
            >
              {isLocked && <Lock size={12} className="text-zinc-600 shrink-0" />}
              <span className={`text-sm font-medium ${isActive ? 'text-coral' : 'text-zinc-300'}`}>
                {m.name}
              </span>
              <span className={`ml-auto text-[11px] font-jet font-bold flex items-center gap-0.5 ${isActive ? 'text-coral' : 'text-zinc-500'}`}>
                <Zap size={10} />
                {effectiveCost}
              </span>
            </button>
          );
        })}
      </div>

      {/* Resolution toggle */}
      <SectionLabel className="mt-4">Resolution</SectionLabel>
      <div className="flex gap-1 mt-2">
        {RESOLUTIONS.map((r) => {
          const model = models.find(m => m.id === selectedModelId);
          const mult = model?.resolutionMultiplier[r] ?? 1;
          const isActive = resolution === r;
          return (
            <button
              key={r}
              onClick={() => setResolution(r)}
              title={mult > 1 ? `${r} — ${mult}x credits` : r}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-coral text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              {r}
              {mult > 1 && !isActive && (
                <span className="text-[9px] text-amber-brand ml-1">x{mult}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ModelSelector;
