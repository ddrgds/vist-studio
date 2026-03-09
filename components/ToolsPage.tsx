import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  Shirt,
  Users,
  Sun,
  Droplets,
  Paintbrush,
  Maximize2,
  Move,
  X,
  type LucideIcon,
} from "lucide-react";

interface ToolsPageProps {
  onTryOn: (file: File) => void;
  onFaceSwap: (file: File) => void;
  onRelight: (file: File) => void;
  onSkinEnhance: (file: File) => void;
  onInpaint: (file: File) => void;
  onUpscale: (file: File) => void;
  onPoseChange: (file: File) => void;
}

interface ToolDef {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  cost: number;
  action: keyof ToolsPageProps;
}

const TOOLS: ToolDef[] = [
  { id: "tryon", name: "Virtual Try-On", desc: "See how clothes look on any person", icon: Shirt, cost: 15, action: "onTryOn" },
  { id: "faceswap", name: "Face Swap", desc: "Replace faces between photos", icon: Users, cost: 15, action: "onFaceSwap" },
  { id: "relight", name: "Relight", desc: "Change lighting and mood of any photo", icon: Sun, cost: 10, action: "onRelight" },
  { id: "skin", name: "Skin Enhancer", desc: "Smooth skin and enhance facial details", icon: Droplets, cost: 8, action: "onSkinEnhance" },
  { id: "inpaint", name: "Inpainting", desc: "Edit specific areas of an image", icon: Paintbrush, cost: 8, action: "onInpaint" },
  { id: "upscale", name: "Upscale 4K", desc: "Increase resolution up to 4x", icon: Maximize2, cost: 5, action: "onUpscale" },
  { id: "pose", name: "Pose Change", desc: "Modify body pose and position", icon: Move, cost: 10, action: "onPoseChange" },
];

const ToolsPage: React.FC<ToolsPageProps> = (props) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [shakeUpload, setShakeUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  const clearUpload = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setUploadedFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [preview]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleToolClick = useCallback(
    (tool: ToolDef) => {
      if (!uploadedFile) {
        setShakeUpload(true);
        setTimeout(() => setShakeUpload(false), 600);
        return;
      }
      props[tool.action](uploadedFile);
    },
    [uploadedFile, props]
  );

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: "#0D0A0A" }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-10">
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight font-display"
            style={{ color: "#F5EDE8" }}
          >
            AI Tools
          </h1>
          <p className="text-sm mt-2" style={{ color: "#8C7570" }}>
            Upload a photo, then choose a tool
          </p>
        </div>

        {/* Upload area */}
        <div
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 mb-10 ${
            shakeUpload ? "animate-shake" : ""
          }`}
          style={{
            borderColor: isDragging
              ? "#FF5C35"
              : shakeUpload
              ? "#ef4444"
              : preview
              ? "#FF5C35"
              : "#2A1F1C",
            background: isDragging
              ? "rgba(255,92,53,0.06)"
              : preview
              ? "rgba(255,92,53,0.03)"
              : "rgba(255,255,255,0.02)",
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !preview && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!preview) fileInputRef.current?.click();
            }
          }}
          aria-label="Upload image area"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
          />

          {preview ? (
            <div className="flex items-center gap-4 p-4">
              <img
                src={preview}
                alt="Uploaded preview"
                className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl"
                style={{ border: "1px solid #2A1F1C" }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "#F5EDE8" }}
                >
                  {uploadedFile?.name}
                </p>
                <p className="text-xs mt-1" style={{ color: "#8C7570" }}>
                  {uploadedFile
                    ? `${(uploadedFile.size / 1024).toFixed(0)} KB`
                    : ""}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearUpload();
                  }}
                  className="mt-2 flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors duration-150"
                  style={{
                    color: "#B8A9A5",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid #2A1F1C",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "rgba(255,92,53,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#2A1F1C";
                  }}
                >
                  <X size={12} />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 cursor-pointer">
              <Upload
                size={32}
                strokeWidth={1.5}
                style={{ color: isDragging ? "#FF5C35" : "#6B5A56" }}
                className="mb-3 transition-colors duration-200"
              />
              <p className="text-sm font-medium" style={{ color: "#B8A9A5" }}>
                Drag a photo here or click to upload
              </p>
              <p className="text-xs mt-1" style={{ color: "#6B5A56" }}>
                PNG, JPG, WebP
              </p>
            </div>
          )}
        </div>

        {/* Tool cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const dimmed = !uploadedFile;
            return (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                className="text-left p-5 rounded-xl border transition-all duration-200 group"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid #2A1F1C",
                  opacity: dimmed ? 0.5 : 1,
                  cursor: dimmed ? "default" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!dimmed) {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "rgba(255,92,53,0.4)";
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "#2A1F1C";
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(0)";
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: "rgba(255,92,53,0.08)",
                      border: "1px solid rgba(255,92,53,0.15)",
                    }}
                  >
                    <Icon size={20} style={{ color: "#FF5C35" }} />
                  </div>
                  <span
                    className="text-[11px] font-bold font-jet px-2 py-0.5 rounded-full"
                    style={{ color: "#FFB347", background: "rgba(255,179,71,0.1)" }}
                  >
                    {tool.cost}
                  </span>
                </div>
                <h3
                  className="text-[14px] font-bold mb-1 font-display"
                  style={{ color: "#F5EDE8" }}
                >
                  {tool.name}
                </h3>
                <p
                  className="text-[12px] leading-relaxed"
                  style={{ color: "#8C7570" }}
                >
                  {tool.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Hint when no image uploaded */}
        {!uploadedFile && (
          <p
            className="text-center text-xs mt-6"
            style={{ color: "#6B5A56" }}
          >
            Upload a photo first to activate the tools
          </p>
        )}
      </div>

      {/* Shake animation keyframes */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default ToolsPage;
