import React, { useRef, useState, useEffect, useCallback } from 'react';

interface UploadZoneProps {
  label: string;
  files: File[] | File | null;
  onFilesChange: (files: File[] | File | null) => void;
  multiple?: boolean;
  onImagePreview?: (url: string) => void;
  icon?: React.ReactNode;
}

const UploadZone: React.FC<UploadZoneProps> = ({ 
  label, 
  files, 
  onFilesChange, 
  multiple = false, 
  onImagePreview, 
  icon 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Helper to normalize files into an array for internal logic
  const fileArray = Array.isArray(files) ? files : (files ? [files] : []);

  // Sync previews when files prop changes
  useEffect(() => {
    const newPreviews: string[] = [];
    
    fileArray.forEach(file => {
      newPreviews.push(URL.createObjectURL(file));
    });

    setPreviews(newPreviews);

    // Cleanup
    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (newFiles: File[]) => {
    // Filter only images
    const imageFiles = newFiles.filter(f => f.type.startsWith('image/'));
    
    if (multiple) {
      // Append if multiple, but check for duplicates or limits if needed
      // For now, we just concat.
      const currentFiles = Array.isArray(files) ? files : (files ? [files] : []);
      onFilesChange([...currentFiles, ...imageFiles]);
    } else {
      // Replace if single
      onFilesChange(imageFiles[0] || null);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, [onFilesChange, multiple, files]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const removeFile = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (multiple && Array.isArray(files)) {
      const newFiles = [...files];
      newFiles.splice(index, 1);
      onFilesChange(newFiles);
    } else {
      onFilesChange(null);
    }
    
    if (inputRef.current) inputRef.current.value = '';
  };

  const handlePreviewClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (url && onImagePreview) {
      onImagePreview(url);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium text-zinc-400">{label}</span>
        {multiple && fileArray.length > 0 && (
            <span className="text-[10px] text-zinc-500">{fileArray.length} archivos</span>
        )}
      </div>
      
      <div
        role="button"
        tabIndex={0}
        aria-label={multiple ? `${label}. ${fileArray.length > 0 ? `${fileArray.length} archivos seleccionados.` : 'Haz clic o arrastra imágenes aquí.'}` : `${label}. ${fileArray.length > 0 ? 'Imagen seleccionada.' : 'Haz clic para subir una imagen.'}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative group cursor-pointer transition-all duration-300
          border-2 border-dashed rounded-xl overflow-hidden min-h-[12rem] flex flex-col items-center justify-center
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-950
          ${isDragging ? 'border-purple-500 bg-purple-500/10' : ''}
          ${fileArray.length > 0 ? 'border-purple-500/30 bg-zinc-900/30' : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'}
        `}
      >
        <input 
          type="file" 
          ref={inputRef} 
          className="hidden" 
          accept="image/*" 
          multiple={multiple}
          onChange={handleFileChange} 
        />
        
        {fileArray.length > 0 ? (
          <div className="w-full h-full p-2 grid grid-cols-2 gap-2 auto-rows-max">
            {previews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group/item border border-zinc-700/50">
                    <img
                      src={src}
                      alt={fileArray[idx] ? `Imagen ${idx + 1}: ${fileArray[idx].name}` : `Imagen subida ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                         {onImagePreview && (
                            <button
                                onClick={(e) => handlePreviewClick(e, src)}
                                aria-label={`Ver imagen ${idx + 1}`}
                                className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                            >
                                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                            </button>
                        )}
                        <button
                            onClick={(e) => removeFile(e, idx)}
                            aria-label={`Eliminar imagen ${idx + 1}`}
                            className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors"
                        >
                            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
            ))}
            {/* Add button placeholder if multiple */}
            {multiple && (
                <div className="aspect-square rounded-lg border border-zinc-800 bg-zinc-900/50 flex items-center justify-center text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400 transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-zinc-500 group-hover:text-zinc-300 transition-colors pointer-events-none p-4 text-center">
            {icon || (
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            )}
            <span className="text-xs font-medium mt-2">{isDragging ? 'Suelta los archivos' : multiple ? 'Elige una o más imágenes' : 'Click para subir imagen'}</span>
            <span className="text-[10px] text-zinc-600 mt-1">{multiple ? 'Soporta selección múltiple' : 'JPG, PNG'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadZone;