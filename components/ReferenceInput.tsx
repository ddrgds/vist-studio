import React, { useRef, useState, useEffect } from 'react';
import EnhancedInput from './EnhancedInput';

interface ReferenceInputProps {
  label: string;
  textValue: string;
  onTextChange: (value: string) => void;
  imageValue: File | File[] | null;
  onImageChange?: (file: File | File[] | null) => void;
  category: string;
  placeholder?: string;
  multiline?: boolean;
  multiple?: boolean;
  /** When true, hides the image upload button and shows a tooltip instead */
  disableImage?: boolean;
  /** Tooltip text shown when disableImage is true */
  disableImageTooltip?: string;
  /** Callback for image preview */
  onImagePreview?: (url: string) => void;
  /** Optional list of preset chips to quickly add text */
  presets?: { label: string; value: string }[];
}

const ReferenceInput: React.FC<ReferenceInputProps> = ({
  label,
  textValue,
  onTextChange,
  imageValue,
  onImageChange,
  category,
  placeholder,
  multiline = false,
  multiple = false,
  disableImage = false,
  disableImageTooltip,
  onImagePreview,
  presets,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const fileArray = Array.isArray(imageValue) ? imageValue : (imageValue ? [imageValue] : []);

  useEffect(() => {
    const urls: string[] = [];
    fileArray.forEach(file => {
      urls.push(URL.createObjectURL(file));
    });
    setPreviews(urls);

    return () => {
      urls.forEach(u => URL.revokeObjectURL(u));
    };
  }, [imageValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onImageChange) return;
    if (e.target.files && e.target.files.length > 0) {
      if (multiple) {
        const newFiles = Array.from(e.target.files);
        const currentFiles = Array.isArray(imageValue) ? imageValue : (imageValue ? [imageValue] : []);
        onImageChange([...currentFiles, ...newFiles]);
      } else {
        onImageChange(e.target.files[0]);
      }
    }
  };

  const removeImage = (index: number) => {
    if (multiple) {
      const currentFiles = Array.isArray(imageValue) ? imageValue : (imageValue ? [imageValue] : []);
      const newFiles = [...currentFiles];
      newFiles.splice(index, 1);
      onImageChange(newFiles);
    } else {
      onImageChange(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <EnhancedInput
        label={label}
        value={textValue}
        onChange={onTextChange}
        category={category}
        placeholder={placeholder}
        multiline={multiline}
      />

      {/* Preset Chips */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                const currentText = textValue ? textValue.trim() : '';
                const newText = currentText
                  ? `${currentText}, ${preset.value}`
                  : preset.value;
                onTextChange(newText);
              }}
              className="px-2 py-1 text-[10px] font-medium bg-zinc-800/80 hover:bg-purple-500/20 text-zinc-400 hover:text-purple-300 border border-zinc-700/50 hover:border-purple-500/30 rounded-md transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Image Reference Area */}
      <div className="flex flex-wrap items-start gap-3">
        {disableImage ? (
          /* Greyed-out placeholder when the current AI engine doesn't support image refs */
          <div
            title={disableImageTooltip}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-lg text-xs text-zinc-600 cursor-not-allowed select-none"
          >
            <div className="p-1 bg-zinc-800/50 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            </div>
            <span className="line-through opacity-50">{multiple ? 'Añadir imágenes' : 'Añadir imagen'}</span>
            {disableImageTooltip && (
              <span className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded no-underline" style={{ textDecoration: 'none' }}>Solo texto</span>
            )}
          </div>
        ) : fileArray.length === 0 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 border-dashed rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all group"
          >
            <div className="p-1 bg-zinc-800 rounded group-hover:bg-zinc-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            </div>
            <span>{multiple ? 'Añadir imágenes (Opcional)' : 'Añadir imagen (Opcional)'}</span>
          </button>
        )}

        {!disableImage && previews.map((url, idx) => (
          <div key={idx} className="relative group animate-in fade-in zoom-in duration-200">
            <div className="h-16 w-16 rounded-lg overflow-hidden border-2 border-purple-500/20 bg-zinc-800 relative shadow-md shadow-purple-900/10 group-hover:border-purple-500/50 transition-all">
              <img src={url} alt="Ref" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-[1px]">
                {onImagePreview && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImagePreview(url);
                    }}
                    className="p-1 bg-white/20 hover:bg-white/40 text-white rounded-full shadow-sm"
                    title="Ver imagen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(idx);
                  }}
                  className="p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full shadow-sm"
                  title="Eliminar referencia"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
            {/* Visual stack indicator if multiple allowed */}
            {multiple && idx === 0 && fileArray.length > 1 && (
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-purple-600 rounded-full border-2 border-zinc-950 flex items-center justify-center text-[8px] text-white font-bold">
                {fileArray.length}
              </div>
            )}
          </div>
        ))}

        {/* Add button small if items exist and multiple allowed */}
        {!disableImage && multiple && fileArray.length > 0 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-16 w-16 flex flex-col items-center justify-center gap-1 bg-zinc-900 border border-zinc-800 border-dashed rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
            title="Añadir más"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        )}

        {!disableImage && (
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            multiple={multiple}
            onChange={handleFileChange}
          />
        )}
      </div>
    </div>
  );
};

export default ReferenceInput;