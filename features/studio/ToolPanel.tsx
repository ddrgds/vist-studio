import React from 'react';
import {
  Sparkles, PersonStanding, Repeat2, Sun, Camera, Box,
  Image, Wand2, RotateCw,
} from 'lucide-react';
import { useStudioStore, type ToolId } from '../../stores/studioStore';
import ModelSelector from './ModelSelector';
import CreateTool from './tools/CreateTool';
import AIEditTool from './tools/AIEditTool';
import PoseTool from './tools/PoseTool';
import SessionTool from './tools/SessionTool';

const TOOLS: { id: ToolId; label: string; Icon: React.ElementType }[] = [
  { id: 'create',   label: 'Create',     Icon: Sparkles },
  { id: 'aiedit',   label: 'AI Edit',    Icon: Wand2 },
  { id: 'pose',     label: 'Pose',       Icon: PersonStanding },
  { id: 'faceswap', label: 'Face Swap',  Icon: Repeat2 },
  { id: 'relight',  label: 'Relight',    Icon: Sun },
  { id: 'camera',   label: 'Camera',     Icon: Camera },
  { id: 'objects',  label: 'Objects',     Icon: Box },
  { id: 'scenes',   label: 'Scenes',     Icon: Image },
  { id: 'session',  label: 'Session',    Icon: Camera },
  { id: 'face360',  label: '360 Face',   Icon: RotateCw },
];

const ToolPanel: React.FC = () => {
  const { activeTool, setActiveTool } = useStudioStore();

  return (
    <div className="w-[320px] h-full bg-zinc-900 border-l border-zinc-800 flex flex-col select-none">
      {/* Tool tabs — scrollable row */}
      <div className="flex gap-1 px-3 pt-3 pb-2 overflow-x-auto custom-scrollbar">
        {TOOLS.map(({ id, label, Icon }) => {
          const isActive = activeTool === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTool(id)}
              title={label}
              className={`flex flex-col items-center gap-1 px-2.5 py-2 rounded-lg min-w-[52px] transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'text-coral bg-coral/10'
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/5'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-semibold uppercase tracking-wider">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="accent-line mx-3 my-1" />

      {/* Tool-specific panel */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3">
        {renderToolPanel(activeTool)}
      </div>

      {/* Model selector always at bottom */}
      <ModelSelector />
    </div>
  );
};

function renderToolPanel(tool: ToolId): React.ReactNode {
  switch (tool) {
    case 'create':   return <CreateTool />;
    case 'aiedit':   return <AIEditTool />;
    case 'pose':     return <PoseTool />;
    case 'session':  return <SessionTool />;
    // These all use the generic prompt-based edit
    case 'relight':  return <AIEditTool placeholder="Describe the lighting: warm golden hour, cool blue, dramatic side light..." />;
    case 'camera':   return <AIEditTool placeholder="Describe the camera angle: low angle, bird's eye, dutch tilt..." />;
    case 'objects':  return <AIEditTool placeholder="Add or modify objects: add sunglasses, hold a coffee cup..." />;
    case 'scenes':   return <AIEditTool placeholder="Change the scene: move to a beach, put in a cafe..." />;
    case 'faceswap': return <AIEditTool placeholder="Describe the face swap: swap face with the uploaded reference..." />;
    case 'face360':  return <AIEditTool placeholder="Generate 360 face views of this character..." />;
    default:         return null;
  }
}

export default ToolPanel;
