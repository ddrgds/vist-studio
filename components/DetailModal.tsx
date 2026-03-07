import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GeneratedContent, InfluencerParams, PoseModificationParams, VideoParams, CharacterParams } from '../types';

interface DetailModalProps {
  item: GeneratedContent;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ item, onClose }) => {
  const formatDate = (ts: number) => new Date(ts).toLocaleString();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store previously focused element and focus close button on mount
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Helpers to create temporary URLs for file objects
  const [poseUrl, setPoseUrl] = useState<string | null>(null);
  const [scenarioUrl, setScenarioUrl] = useState<string | null>(null);
  const [accessoryUrl, setAccessoryUrl] = useState<string | null>(null);

  useEffect(() => {
    let pUrl = '';
    let sUrl = '';
    let aUrl = '';

    if (item.type === 'create') {
        const p = item.params as InfluencerParams;
        // FIX: Handle backward compatibility for old data structures.
        const firstChar = p.characters?.[0];
        const poseImage = firstChar?.poseImage || (p as any).poseImage;
        if (poseImage && poseImage instanceof File) {
             pUrl = URL.createObjectURL(poseImage);
             setPoseUrl(pUrl);
        }
        if (p.scenarioImage && p.scenarioImage.length > 0 && p.scenarioImage[0] instanceof File) {
             sUrl = URL.createObjectURL(p.scenarioImage[0]); // Just show first
             setScenarioUrl(sUrl);
        }
        const accessoryImages = firstChar?.accessoryImages || (p as any).accessoryImages;
        if (accessoryImages && accessoryImages.length > 0 && accessoryImages[0] instanceof File) {
             aUrl = URL.createObjectURL(accessoryImages[0]);
             setAccessoryUrl(aUrl);
        }
    } else if (item.type === 'edit') {
        const p = item.params as PoseModificationParams;
        // Legacy support for single poseImage which might not exist on type
        const legacyPoseImage = (p as any).poseImage;
        if (p.poseImages && p.poseImages.length > 0) {
             pUrl = URL.createObjectURL(p.poseImages[0]);
             setPoseUrl(pUrl);
        } else if (legacyPoseImage && legacyPoseImage instanceof File) {
            pUrl = URL.createObjectURL(legacyPoseImage);
            setPoseUrl(pUrl);
       }

       if (p.accessoryImages && p.accessoryImages.length > 0 && p.accessoryImages[0] instanceof File) {
           aUrl = URL.createObjectURL(p.accessoryImages[0]);
           setAccessoryUrl(aUrl);
       }
    }

    return () => {
        if (pUrl) URL.revokeObjectURL(pUrl);
        if (sUrl) URL.revokeObjectURL(sUrl);
        if (aUrl) URL.revokeObjectURL(aUrl);
    };
  }, [item]);

  const renderParams = () => {
    if (item.type === 'create') {
        const p = item.params as InfluencerParams;
        // FIX: Handle backward compatibility for old data structures.
        const pAsAny = p as any;
        const firstChar: Partial<CharacterParams> = p.characters?.[0] || {};
        
        const characteristics = firstChar.characteristics ?? pAsAny.characteristics;
        const pose = firstChar.pose ?? pAsAny.pose;
        const accessory = firstChar.accessory ?? pAsAny.accessory;
        const modelImages = firstChar.modelImages ?? pAsAny.modelImages ?? (pAsAny.modelImage ? [pAsAny.modelImage] : []);
        const outfitImages = firstChar.outfitImages ?? pAsAny.outfitImages ?? (pAsAny.outfitImage ? [pAsAny.outfitImage] : []);

        return (
            <div className="space-y-4">
                <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Concepto</span>
                    {characteristics && <div className="mt-1"><span className="text-zinc-400 text-xs">Características:</span> <p className="text-sm text-zinc-200">{characteristics}</p></div>}
                    
                    {/* FIX: Property 'maintainIdentity' did not exist on type and was removed. */}
                    
                    <div className="mt-2">
                        <span className="text-zinc-400 text-xs">Pose:</span> 
                        {pose && <p className="text-sm text-zinc-200">{pose}</p>}
                        {poseUrl && (
                            <div className="mt-1 h-16 w-16 rounded border border-zinc-700 overflow-hidden relative group">
                                <img src={poseUrl} className="w-full h-full object-cover" alt="Pose reference" />
                                <div aria-hidden="true" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[8px] text-white">Ref Pose</div>
                            </div>
                        )}
                        {!pose && !poseUrl && <p className="text-sm text-zinc-500 italic">No especificada</p>}
                    </div>

                    <div className="mt-2">
                        <span className="text-zinc-400 text-xs">Escenario:</span>
                        {p.scenario && <p className="text-sm text-zinc-200">{p.scenario}</p>}
                        {scenarioUrl && (
                            <div className="mt-1 h-16 w-24 rounded border border-zinc-700 overflow-hidden relative group">
                                <img src={scenarioUrl} className="w-full h-full object-cover" alt="Imagen de referencia de escenario" />
                                <div aria-hidden="true" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[8px] text-white">Ref Escenario</div>
                            </div>
                        )}
                        {!p.scenario && !scenarioUrl && <p className="text-sm text-zinc-500 italic">No especificado</p>}
                    </div>

                    <div className="mt-2">
                        <span className="text-zinc-400 text-xs">Objeto / Accesorio:</span>
                        {accessory && <p className="text-sm text-zinc-200">{accessory}</p>}
                        {accessoryUrl && (
                            <div className="mt-1 h-16 w-16 rounded border border-zinc-700 overflow-hidden relative group">
                                <img src={accessoryUrl} className="w-full h-full object-cover" alt="Imagen de referencia de accesorio" />
                                <div aria-hidden="true" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[8px] text-white">Ref Objeto</div>
                            </div>
                        )}
                        {!accessory && !accessoryUrl && <p className="text-sm text-zinc-500 italic">Ninguno</p>}
                    </div>

                    {p.lighting && <div className="mt-2"><span className="text-zinc-400 text-xs">Iluminación:</span> <p className="text-sm text-zinc-200">{p.lighting}</p></div>}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                     <div className="bg-zinc-800/30 p-2 rounded border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">Resolución</span>
                        <span className="text-sm font-mono text-purple-300">{p.imageSize}</span>
                     </div>
                     <div className="bg-zinc-800/30 p-2 rounded border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">Aspect Ratio</span>
                        <span className="text-sm font-mono text-purple-300">{p.aspectRatio}</span>
                     </div>
                      {p.steps && (
                         <div className="bg-zinc-800/30 p-2 rounded border border-zinc-800">
                            <span className="text-[10px] text-zinc-500 block">Pasos</span>
                            <span className="text-sm font-mono text-purple-300">{p.steps}</span>
                         </div>
                     )}
                     {p.cfg && (
                         <div className="bg-zinc-800/30 p-2 rounded border border-zinc-800">
                            <span className="text-[10px] text-zinc-500 block">Guía (CFG)</span>
                            <span className="text-sm font-mono text-purple-300">{p.cfg}</span>
                         </div>
                     )}
                     <div className="bg-zinc-800/30 p-2 rounded border border-zinc-800 col-span-2">
                        <span className="text-[10px] text-zinc-500 block">Referencias Principales</span>
                        <div className="flex gap-2 mt-1">
                             <span className="px-2 py-0.5 bg-zinc-700 rounded text-xs">Model: {modelImages.length}</span>
                             <span className="px-2 py-0.5 bg-zinc-700 rounded text-xs">Outfit: {outfitImages.length}</span>
                        </div>
                     </div>
                </div>
            </div>
        );
    } 
    else if (item.type === 'edit') {
        const p = item.params as PoseModificationParams;
        return (
             <div className="space-y-4">
                 <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Edit</span>
                    <div className="mt-1">
                        <span className="text-zinc-400 text-xs">New Pose:</span> 
                        {p.pose && <p className="text-sm text-zinc-200">{p.pose}</p>}
                        {poseUrl && (
                            <div className="mt-1 h-16 w-16 rounded border border-zinc-700 overflow-hidden relative group">
                                <img src={poseUrl} className="w-full h-full object-cover" alt="Pose reference" />
                                <div aria-hidden="true" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[8px] text-white">Ref Pose</div>
                            </div>
                        )}
                    </div>
                     <div className="mt-2">
                        <span className="text-zinc-400 text-xs">Objeto / Accesorio:</span>
                        {p.accessory && <p className="text-sm text-zinc-200">{p.accessory}</p>}
                        {accessoryUrl && (
                            <div className="mt-1 h-16 w-16 rounded border border-zinc-700 overflow-hidden relative group">
                                <img src={accessoryUrl} className="w-full h-full object-cover" alt="Imagen de referencia de accesorio" />
                                <div aria-hidden="true" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[8px] text-white">Ref Objeto</div>
                            </div>
                        )}
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-3">
                     <div className="bg-zinc-800/30 p-2 rounded border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">Resolución</span>
                        <span className="text-sm font-mono text-purple-300">{p.imageSize}</span>
                     </div>
                     <div className="bg-zinc-800/30 p-2 rounded border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">Ratio</span>
                        <span className="text-sm font-mono text-purple-300">{p.aspectRatio}</span>
                     </div>
                </div>
             </div>
        );
    }
    else {
        const p = item.params as VideoParams;
        return (
             <div className="space-y-4">
                 <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Guion</span>
                    <div className="mt-1"><span className="text-zinc-400 text-xs">Prompt Acción:</span> <p className="text-sm text-zinc-200">{p.prompt}</p></div>
                    {p.dialogue && <div className="mt-2"><span className="text-zinc-400 text-xs">Diálogo:</span> <p className="text-sm text-zinc-200 italic">"{p.dialogue}"</p></div>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                     <div className="bg-zinc-800/30 p-2 rounded border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">Resolución</span>
                        <span className="text-sm font-mono text-purple-300">{p.resolution}</span>
                     </div>
                     <div className="bg-zinc-800/30 p-2 rounded border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">Audio</span>
                        <span className="text-sm font-mono text-purple-300">{p.voiceFile ? 'Custom Voice' : 'Silent/Default'}</span>
                     </div>
                </div>
             </div>
        )
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-0 lg:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        className="bg-zinc-950 border-0 lg:border border-zinc-800 rounded-none lg:rounded-2xl w-full max-w-6xl h-full lg:h-[85vh] flex flex-col lg:flex-row overflow-hidden shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Cerrar modal"
            className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors backdrop-blur-sm"
        >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        {/* Left (Top on Mobile): Media View */}
        <div className="flex-1 bg-black flex items-center justify-center p-8 relative group h-[45vh] lg:h-auto border-b lg:border-b-0 border-zinc-800">
             {item.type === 'video' ? (
                <video controls src={item.url} aria-label="Video generado" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            ) : (
                <img src={item.url} alt="Imagen generada" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            )}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <a 
                    href={item.url} 
                    download={`influencer-${item.id}.${item.type === 'video' ? 'mp4' : 'png'}`}
                    className="px-6 py-2 bg-white text-black font-medium rounded-full hover:bg-zinc-200 transition-colors shadow-lg flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Descargar Original
                </a>
            </div>
        </div>

        {/* Right (Bottom on Mobile): Metadata */}
        <div className="w-full lg:w-96 border-l border-zinc-800 bg-zinc-900 flex flex-col shrink-0 h-[55vh] lg:h-auto">
            <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center gap-3 mb-1">
                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.type === 'create' ? 'bg-purple-900/50 text-purple-300 border border-purple-500/20' :
                        item.type === 'edit' ? 'bg-blue-900/50 text-blue-300 border border-blue-500/20' :
                        'bg-red-900/50 text-red-300 border border-red-500/20'
                     }`}>
                        {item.type === 'create' ? 'Creation' : item.type === 'edit' ? 'Edit' : 'Generated Video'}
                     </span>
                     <span className="text-xs text-zinc-500">{formatDate(item.timestamp)}</span>
                </div>
                <h2 id="detail-modal-title" className="text-xl font-bold text-white">Detalles de Generación</h2>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                {renderParams()}

                <div className="mt-8 pt-6 border-t border-zinc-800">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">ID del recurso</h3>
                    <code className="block bg-zinc-950 p-2 rounded text-[10px] text-zinc-600 font-mono break-all select-all cursor-pointer hover:text-zinc-400">
                        {item.id}
                    </code>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;