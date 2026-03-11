import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStudioStore, type ToolId } from '../stores/studioStore';
import Canvas from '../features/studio/Canvas';
import ToolPanel from '../features/studio/ToolPanel';

const VALID_TOOLS: ToolId[] = ['create', 'aiedit', 'pose', 'faceswap', 'relight', 'camera', 'objects', 'scenes', 'session', 'face360'];

const Studio: React.FC = () => {
  const [params] = useSearchParams();
  const { setActiveTool } = useStudioStore();

  // Sync tool from URL query param (?tool=create)
  useEffect(() => {
    const tool = params.get('tool');
    if (tool && VALID_TOOLS.includes(tool as ToolId)) {
      setActiveTool(tool as ToolId);
    }
  }, [params, setActiveTool]);

  return (
    <div className="flex h-full bg-[#0D0A0A]">
      {/* Canvas — takes all remaining space */}
      <Canvas />

      {/* Right panel — tools, model selector, properties */}
      <ToolPanel />
    </div>
  );
};

export default Studio;
