import React, { useState } from 'react';

interface ExportModalProps {
  imageUrl: string;
  onClose: () => void;
}

interface Preset {
  id: string;
  icon: string;
  label: string;
  dimensions: string;
  ratio: string;
}

const presets: Preset[] = [
  { id: 'instagram-post', icon: '📸', label: 'Instagram Post', dimensions: '1080 × 1350', ratio: '4:5' },
  { id: 'instagram-story', icon: '📱', label: 'Instagram Story', dimensions: '1080 × 1920', ratio: '9:16' },
  { id: 'tiktok-reel', icon: '🎬', label: 'TikTok / Reel', dimensions: '1080 × 1920', ratio: '9:16' },
  { id: 'youtube-thumb', icon: '🖥️', label: 'YouTube Thumbnail', dimensions: '1280 × 720', ratio: '16:9' },
  { id: 'twitter-x', icon: '🐦', label: 'Twitter / X', dimensions: '1600 × 900', ratio: '16:9' },
  { id: 'square', icon: '📐', label: 'Square', dimensions: '1080 × 1080', ratio: '1:1' },
  { id: 'original', icon: '💾', label: 'Original', dimensions: 'Full resolution', ratio: 'as-is' },
];

const ExportModal: React.FC<ExportModalProps> = ({ imageUrl, onClose }) => {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (preset: Preset) => {
    setExporting(preset.id);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vist-${preset.id}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(null);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(8,7,12,0.95)',
        backdropFilter: 'blur(20px)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 32,
          maxWidth: 900,
          width: '90vw',
          maxHeight: '85vh',
          padding: 32,
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.04)',
            color: '#A898B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 18,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,107,157,0.12)';
            e.currentTarget.style.color = '#FF6B9D';
            e.currentTarget.style.borderColor = 'rgba(255,107,157,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = '#A898B8';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
          }}
        >
          ✕
        </button>

        {/* Image preview */}
        <div
          style={{
            flex: '0 0 340px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <h2 style={{ color: '#F0EAF4', fontSize: 20, fontWeight: 600, margin: 0 }}>
            Export Image
          </h2>
          <p style={{ color: '#685880', fontSize: 13, margin: 0 }}>
            Choose a format optimized for your platform
          </p>
          <div
            style={{
              marginTop: 8,
              borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.04)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <img
              src={imageUrl}
              alt="Export preview"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: 400,
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        </div>

        {/* Presets grid */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            overflowY: 'auto',
            paddingTop: 44,
          }}
        >
          {presets.map((preset) => {
            const isActive = exporting === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleExport(preset)}
                disabled={exporting !== null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.04)',
                  background: isActive
                    ? 'rgba(255,107,157,0.10)'
                    : 'rgba(255,255,255,0.02)',
                  cursor: exporting ? 'wait' : 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: exporting && !isActive ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!exporting) {
                    e.currentTarget.style.background = 'rgba(255,107,157,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255,107,157,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                  }
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{preset.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#F0EAF4', fontSize: 14, fontWeight: 500 }}>
                    {preset.label}
                  </div>
                  <div style={{ color: '#685880', fontSize: 12, marginTop: 2 }}>
                    {preset.dimensions}
                    {preset.ratio !== 'as-is' && (
                      <span style={{ color: '#A898B8', marginLeft: 8 }}>({preset.ratio})</span>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    color: '#685880',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {isActive ? (
                    <span style={{ color: '#FF6B9D' }}>Exporting...</span>
                  ) : (
                    <span style={{ color: '#A898B8', fontSize: 16 }}>↓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
